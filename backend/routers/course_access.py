from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, log_audit_event
from auth import get_current_user, require_roles
from models import CourseAccessRequest, User, Course, Enrollment, Notification
from schemas import CourseAccessRequestCreate, CourseAccessRequestOut
from datetime import datetime, timezone
from typing import List

router = APIRouter(prefix="/course-access-requests", tags=["Course Access Requests"])

@router.post("", response_model=CourseAccessRequestOut)
def submit_request(
    body: CourseAccessRequestCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    user_id = current_user["id"]
    company_id = current_user.get("company_id")
    
    # Fetch user record to retrieve name and email reliably
    user_record = db.query(User).filter(User.id == user_id).first()
    if not user_record:
        raise HTTPException(status_code=404, detail="User not found")
    user_name = user_record.name
    user_email = user_record.email
    
    # 1. Validate course exists and is in the same company
    course = db.query(Course).filter(Course.id == body.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if company_id and course.company_id and course.company_id != company_id:
        raise HTTPException(status_code=403, detail="Course is not available for your company")

    # 2. Check active enrollment (or completed)
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == user_id,
        Enrollment.course_id == body.course_id
    ).first()
    if enrollment:
        if enrollment.is_completed:
            raise HTTPException(status_code=400, detail="You have already completed this course")
        if enrollment.is_active:
            raise HTTPException(status_code=400, detail="You are already enrolled/assigned to this course")

    # 3. Check for existing request
    existing_request = db.query(CourseAccessRequest).filter(
        CourseAccessRequest.user_id == user_id,
        CourseAccessRequest.course_id == body.course_id
    ).first()

    if existing_request:
        if existing_request.status in ["pending", "approved"]:
            raise HTTPException(
                status_code=400, 
                detail="You already have an active or approved request for this course"
            )
        
        # If rejected or fulfilled, reuse/reset the record
        existing_request.status = "pending"
        existing_request.reviewed_by = None
        existing_request.reviewed_at = None
        existing_request.updated_at = datetime.now(timezone.utc)
        req = existing_request
    else:
        # Create new request
        req = CourseAccessRequest(
            user_id=user_id,
            course_id=body.course_id,
            status="pending"
        )
        db.add(req)

    db.commit()
    db.refresh(req)

    # 4. Notify all admins in the company
    try:
        admins = db.query(User).filter(
            User.company_id == company_id,
            User.role.in_(["admin", "super_admin"]),
            User.is_active == True
        ).all()

        for admin in admins:
            notif = Notification(
                user_id=admin.id,
                title="New Course Access Request",
                message=f"Employee {user_name} has requested access to '{course.title}'.",
                type="course_access_request",
                route="/dashboard",
                is_read=False
            )
            db.add(notif)
        db.commit()
    except Exception as e:
        print(f"Failed to create admin notifications: {e}")

    try:
        log_audit_event(
            db, 
            "Course Access Requested", 
            user_id, 
            course.title, 
            f"User {user_name} requested access to '{course.title}'", 
            company_id
        )
    except Exception as e:
        print(f"Failed to log audit event: {e}")

    return {
        "id": req.id,
        "user_id": req.user_id,
        "course_id": req.course_id,
        "status": req.status,
        "reviewed_by": req.reviewed_by,
        "reviewed_at": req.reviewed_at,
        "created_at": req.created_at,
        "updated_at": req.updated_at,
        "user_name": user_name,
        "user_email": user_email,
        "course_title": course.title
    }

@router.get("", response_model=List[CourseAccessRequestOut])
def list_requests(
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["admin", "super_admin"]))
):
    company_id = current_user.get("company_id")
    
    query = db.query(CourseAccessRequest).join(User, CourseAccessRequest.user_id == User.id).filter(User.is_active == True)
    if company_id:
        query = query.filter(User.company_id == company_id)
        
    requests = query.order_by(CourseAccessRequest.created_at.desc()).all()
    
    result = []
    for r in requests:
        user_obj = db.query(User).filter(User.id == r.user_id).first()
        course_obj = db.query(Course).filter(Course.id == r.course_id).first()
        reviewer_name = None
        if r.reviewed_by:
            reviewer = db.query(User).filter(User.id == r.reviewed_by).first()
            if reviewer:
                reviewer_name = reviewer.name
                
        result.append({
            "id": r.id,
            "user_id": r.user_id,
            "course_id": r.course_id,
            "status": r.status,
            "reviewed_by": r.reviewed_by,
            "reviewed_at": r.reviewed_at,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
            "user_name": user_obj.name if user_obj else "Unknown User",
            "user_email": user_obj.email if user_obj else "N/A",
            "course_title": course_obj.title if course_obj else "Unknown Course",
            "reviewer_name": reviewer_name,
            "employee_id": user_obj.employee_id if user_obj else None
        })
        
    return result

@router.post("/{request_id}/approve")
def approve_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["admin", "super_admin"]))
):
    company_id = current_user.get("company_id")
    
    req = db.query(CourseAccessRequest).filter(CourseAccessRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    user_obj = db.query(User).filter(User.id == req.user_id).first()
    if company_id and user_obj and user_obj.company_id != company_id:
        raise HTTPException(status_code=403, detail="You do not have permission to manage this request")
        
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request is already processed")
        
    course_obj = db.query(Course).filter(Course.id == req.course_id).first()
    course_title = course_obj.title if course_obj else "Course"
    
    req.status = "approved"
    req.reviewed_by = current_user["id"]
    req.reviewed_at = datetime.now(timezone.utc)
    req.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    
    try:
        notif = Notification(
            user_id=req.user_id,
            title="Access Request Approved",
            message=f"Your request for {course_title} has been approved and is awaiting assignment by an administrator.",
            type="course_access_approved",
            route="/courses",
            is_read=False
        )
        db.add(notif)
        db.commit()
    except Exception as e:
        print(f"Failed to create employee notification: {e}")
        
    log_audit_event(
        db, 
        "Course Access Approved", 
        current_user["id"], 
        user_obj.name if user_obj else "Employee", 
        f"Approved access request to '{course_title}' for user {user_obj.name if user_obj else req.user_id}", 
        company_id
    )
    
    return {"message": "Request approved successfully"}

@router.post("/{request_id}/reject")
def reject_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["admin", "super_admin"]))
):
    company_id = current_user.get("company_id")
    
    req = db.query(CourseAccessRequest).filter(CourseAccessRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    user_obj = db.query(User).filter(User.id == req.user_id).first()
    if company_id and user_obj and user_obj.company_id != company_id:
        raise HTTPException(status_code=403, detail="You do not have permission to manage this request")
        
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request is already processed")
        
    course_obj = db.query(Course).filter(Course.id == req.course_id).first()
    course_title = course_obj.title if course_obj else "Course"
    
    req.status = "rejected"
    req.reviewed_by = current_user["id"]
    req.reviewed_at = datetime.now(timezone.utc)
    req.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    
    try:
        notif = Notification(
            user_id=req.user_id,
            title="Access Request Rejected",
            message=f"Your request for {course_title} has been rejected.",
            type="course_access_rejected",
            route="/courses",
            is_read=False
        )
        db.add(notif)
        db.commit()
    except Exception as e:
        print(f"Failed to create employee notification: {e}")
        
    log_audit_event(
        db, 
        "Course Access Rejected", 
        current_user["id"], 
        user_obj.name if user_obj else "Employee", 
        f"Rejected access request to '{course_title}' for user {user_obj.name if user_obj else req.user_id}", 
        company_id
    )
    
    return {"message": "Request rejected successfully"}
