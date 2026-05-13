from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from auth import require_roles, get_current_user
from models import AssignmentRequest, User, Course, Enrollment, Module
from schemas import AssignmentRequestCreate, AssignmentRequestOut
from .courses import compute_progress
from datetime import datetime, timezone, timedelta
from sqlalchemy import func
from typing import List

router = APIRouter(tags=["assignments"])

@router.post("/assignments/request", response_model=AssignmentRequestOut)
def create_assignment_request(
    body: AssignmentRequestCreate, 
    db: Session = Depends(get_db), 
    current_user=Depends(require_roles(["hr", "admin"]))
):
    try:
        company_id = current_user.get("company_id")
        
        # 1. Validate User
        user = db.query(User).filter(User.id == body.user_id, User.company_id == company_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Employee not found in your company context")
            
        # 2. Validate Course
        course = db.query(Course).filter(Course.id == body.course_id, Course.company_id == company_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found or inactive for your company")
            
        # 3. Validate HR/Requester
        # Allow any 'hr' or 'admin' from the same company to be the requester
        hr = db.query(User).filter(
            User.id == body.hr_id, 
            User.company_id == company_id,
            User.role.in_(['hr', 'admin', 'super_admin'])
        ).first()
        if not hr:
            raise HTTPException(status_code=404, detail="Authorized requester (HR/Admin) not found")
        
        # 4. Check Duplicate Requests
        existing = db.query(AssignmentRequest).filter(
            AssignmentRequest.user_id == body.user_id,
            AssignmentRequest.course_id == body.course_id,
            AssignmentRequest.status == "pending"
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="An assignment request for this course is already pending review")
        
        # 5. Check Existing Enrollment
        enrolled = db.query(Enrollment).filter(
            Enrollment.user_id == body.user_id,
            Enrollment.course_id == body.course_id
        ).first()
        if enrolled:
            raise HTTPException(status_code=400, detail="User is already enrolled in this curriculum")

        # 6. Safety: Default Due Date Logic
        # This will be finalized on approval, but we can store a suggested one
        final_due_date = body.requested_due_date
        if not final_due_date:
            duration = course.completion_duration_days if course.completion_duration_days else 30
            final_due_date = datetime.now(timezone.utc) + timedelta(days=duration)

        # 7. Create Request
        new_request = AssignmentRequest(
            hr_id=hr.id,
            user_id=user.id,
            course_id=course.id,
            status="pending",
            requested_due_date=body.requested_due_date,
            due_date=final_due_date,
            note=body.note
        )
        
        db.add(new_request)
        db.commit()
        db.refresh(new_request)

        # 8. Create Notifications for Admins
        try:
            from models import Notification
            # Find all admins/superadmins in this company
            admins = db.query(User).filter(
                User.company_id == company_id,
                User.role.in_(['admin', 'super_admin']),
                User.is_active == True
            ).all()

            for admin in admins:
                notif = Notification(
                    user_id=admin.id,
                    title="New Assignment Request",
                    message=f"HR ({hr.name}) requested '{course.title}' for {user.name}",
                    type="assignment_request",
                    route="/assignments",
                    is_read=False
                )
                db.add(notif)
            db.commit()
        except Exception as notif_err:
            print(f"Notification Error (non-fatal): {notif_err}")
        
        # 9. Return safely with a plain dictionary to ensure serialization safety
        return {
            "id": new_request.id,
            "admin_id": new_request.admin_id,
            "hr_id": new_request.hr_id,
            "user_id": new_request.user_id,
            "course_id": new_request.course_id,
            "status": new_request.status,
            "requested_due_date": new_request.requested_due_date,
            "due_date": new_request.due_date,
            "note": new_request.note,
            "reason": new_request.reason,
            "created_at": new_request.created_at,
            "updated_at": new_request.updated_at,
            "approved_at": new_request.approved_at,
            "user_name": user.name,
            "user_email": user.email,
            "course_title": course.title,
            "hr_name": hr.name,
            "employee_id": user.employee_id
        }

    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        print(f"CRITICAL ERROR IN ASSIGNMENT REQUEST: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/assignments/pending", response_model=List[AssignmentRequestOut])
def get_pending_requests(
    db: Session = Depends(get_db), 
    current_user=Depends(require_roles(["hr", "admin"]))
):
    try:
        company_id = current_user.get("company_id")
        query = db.query(AssignmentRequest).join(Course).filter(
            Course.company_id == company_id,
            AssignmentRequest.status == "pending"
        ).options(
            joinedload(AssignmentRequest.admin),
            joinedload(AssignmentRequest.user),
            joinedload(AssignmentRequest.course)
        )
        
        if current_user["role"] == "hr":
            query = query.filter(AssignmentRequest.hr_id == current_user["id"])
            
        requests = query.all()
        
        results = []
        for r in requests:
            try:
                out = AssignmentRequestOut.from_orm(r)
                out.admin_name = r.admin.name if r.admin else "Pending Approval"
                out.user_name = r.user.name if r.user else "Unknown User"
                out.user_email = r.user.email if r.user else "N/A"
                out.course_title = r.course.title if r.course else "Untitled Course"
                out.hr_name = r.hr.name if r.hr else "Unknown HR"
                out.completion_duration_days = r.course.completion_duration_days if r.course else None
                out.employee_id = r.user.employee_id if r.user else "N/A"

                if r.status == "approved":
                    out.approval_timestamp = r.approved_at or r.updated_at
                    # Calculate progress
                    total_mods = db.query(func.count(Module.id)).filter(
                        Module.course_id == r.course_id, Module.is_active == True
                    ).scalar() or 0
                    p = compute_progress(db, r.user_id, r.course_id, total_mods)
                    out.progress_percent = p.progress_percent

                results.append(out)
            except Exception as item_err:
                print(f"Error serializing assignment request {r.id}: {item_err}")
                continue
            
        return results
    except Exception as e:
        print(f"Pending Requests Error: {e}")
        import traceback
        traceback.print_exc()
        return []

@router.get("/assignments/all", response_model=List[AssignmentRequestOut])
def get_all_requests(
    db: Session = Depends(get_db), 
    current_user=Depends(require_roles(["hr", "admin"]))
):
    try:
        company_id = current_user.get("company_id")
        query = db.query(AssignmentRequest).join(Course).filter(
            Course.company_id == company_id
        ).options(
            joinedload(AssignmentRequest.admin),
            joinedload(AssignmentRequest.user),
            joinedload(AssignmentRequest.course)
        )
        
        if current_user["role"] == "hr":
            query = query.filter(AssignmentRequest.hr_id == current_user["id"])
            
        requests = query.order_by(AssignmentRequest.created_at.desc()).all()
        
        results = []
        for r in requests:
            try:
                out = AssignmentRequestOut.from_orm(r)
                out.admin_name = r.admin.name if r.admin else "Pending Approval"
                out.user_name = r.user.name if r.user else "Unknown User"
                out.user_email = r.user.email if r.user else "N/A"
                out.course_title = r.course.title if r.course else "Untitled Course"
                out.hr_name = r.hr.name if r.hr else "Unknown HR"
                out.completion_duration_days = r.course.completion_duration_days if r.course else None
                out.employee_id = r.user.employee_id if r.user else "N/A"

                if r.status == "approved":
                    out.approval_timestamp = r.approved_at or r.updated_at
                    # Calculate progress
                    total_mods = db.query(func.count(Module.id)).filter(
                        Module.course_id == r.course_id, Module.is_active == True
                    ).scalar() or 0
                    p = compute_progress(db, r.user_id, r.course_id, total_mods)
                    out.progress_percent = p.progress_percent

                results.append(out)
            except Exception as item_err:
                print(f"Error serializing assignment request {r.id}: {item_err}")
                continue
            
        return results
    except Exception as e:
        print(f"All Requests Error: {e}")
        import traceback
        traceback.print_exc()
        return []

@router.post("/assignments/{request_id}/approve")
def approve_assignment(
    request_id: int, 
    db: Session = Depends(get_db), 
    current_user=Depends(require_roles(["admin", "super_admin"]))
):
    company_id = current_user.get("company_id")
    request = db.query(AssignmentRequest).join(Course).filter(
        AssignmentRequest.id == request_id,
        Course.company_id == company_id
    ).first()
    
    if not request: raise HTTPException(status_code=404, detail="Request not found")
    if request.status != "pending": raise HTTPException(status_code=400, detail="Request is already processed")
    
    # 1. Create Enrollment
    due_date = request.requested_due_date
    if not due_date and request.course and request.course.completion_duration_days:
        due_date = request.created_at + timedelta(days=request.course.completion_duration_days)

    enrollment = Enrollment(
        user_id=request.user_id, 
        course_id=request.course_id,
        due_date=due_date
    )
    db.add(enrollment)
    
    request.status = "approved"
    request.admin_id = current_user["id"]
    request.approved_at = datetime.now(timezone.utc)
    request.updated_at = datetime.now(timezone.utc)
    request.due_date = due_date
    
    # 3. Create Activity Log
    from models import ActivityLog
    activity = ActivityLog(
        company_id=company_id,
        user_id=current_user["id"],
        action=f"Approved course assignment for {request.user.name}: {request.course.title}"
    )
    db.add(activity)
    
    db.commit()
    return {"message": "Assignment approved and user enrolled"}

@router.post("/assignments/{request_id}/reject")
def reject_assignment(
    request_id: int, 
    db: Session = Depends(get_db), 
    current_user=Depends(require_roles(["admin", "super_admin"]))
):
    company_id = current_user.get("company_id")
    request = db.query(AssignmentRequest).join(Course).filter(
        AssignmentRequest.id == request_id,
        Course.company_id == company_id
    ).first()
    
    if not request: raise HTTPException(status_code=404, detail="Request not found")
    if request.status != "pending": raise HTTPException(status_code=400, detail="Request is already processed")
    
    request.status = "rejected"
    request.admin_id = current_user["id"]
    request.updated_at = datetime.now(timezone.utc)
    
    # Create Activity Log
    from models import ActivityLog
    activity = ActivityLog(
        company_id=company_id,
        user_id=current_user["id"],
        action=f"Rejected course assignment for {request.user.name}: {request.course.title}"
    )
    db.add(activity)
    
    db.commit()
    return {"message": "Assignment request rejected"}

@router.get("/assignments/count")
def get_pending_count(
    db: Session = Depends(get_db), 
    current_user=Depends(require_roles(["hr", "admin"]))
):
    company_id = current_user.get("company_id")
    query = db.query(AssignmentRequest).join(Course).filter(
        Course.company_id == company_id,
        AssignmentRequest.status == "pending"
    )
    
    if current_user["role"] == "hr":
        query = query.filter(AssignmentRequest.hr_id == current_user["id"])
        
    count = query.count()
    return {"count": count}

@router.delete("/assignments/{request_id}/cancel")
def cancel_assignment(
    request_id: int, 
    db: Session = Depends(get_db), 
    current_user=Depends(require_roles(["hr", "admin"]))
):
    # Only HR who created it or Admin can cancel
    request = db.query(AssignmentRequest).filter(AssignmentRequest.id == request_id).first()
    
    if not request: raise HTTPException(status_code=404, detail="Request not found")
    if request.status != "pending": raise HTTPException(status_code=400, detail="Only pending requests can be cancelled")
    if current_user["role"] == "hr" and request.hr_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only cancel your own requests")
        
    db.delete(request)
    db.commit()
    return {"message": "Assignment request cancelled"}
