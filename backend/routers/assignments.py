from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from auth import require_roles, get_current_user
from models import AssignmentRequest, User, Course, Enrollment
from schemas import AssignmentRequestCreate, AssignmentRequestOut
from typing import List

router = APIRouter(tags=["assignments"])

@router.post("/assignments/request", response_model=AssignmentRequestOut)
def create_assignment_request(
    body: AssignmentRequestCreate, 
    db: Session = Depends(get_db), 
    current_user=Depends(require_roles(["hr", "admin"]))
):
    company_id = current_user.get("company_id")
    # Check if user and course exist in the same company
    user = db.query(User).filter(User.id == body.user_id, User.company_id == company_id).first()
    course = db.query(Course).filter(Course.id == body.course_id, Course.company_id == company_id).first()
    hr = db.query(User).filter(User.id == body.hr_id, User.role == 'hr', User.company_id == company_id).first()
    
    if not user: raise HTTPException(status_code=404, detail="User not found in your company")
    if not course: raise HTTPException(status_code=404, detail="Course not found in your company")
    if not hr: raise HTTPException(status_code=404, detail="HR member not found in your company")
    
    # Check if already enrolled or request pending
    existing = db.query(AssignmentRequest).filter(
        AssignmentRequest.user_id == body.user_id,
        AssignmentRequest.course_id == body.course_id,
        AssignmentRequest.status == "pending"
    ).first()
    if existing: raise HTTPException(status_code=400, detail="A request for this assignment is already pending")
    
    enrolled = db.query(Enrollment).filter(
        Enrollment.user_id == body.user_id,
        Enrollment.course_id == body.course_id
    ).first()
    if enrolled: raise HTTPException(status_code=400, detail="User is already enrolled in this course")

    new_request = AssignmentRequest(
        admin_id=current_user["id"],  # Set to creator temporarily, updated on approval
        hr_id=body.hr_id,
        user_id=body.user_id,
        course_id=body.course_id,
        status="pending",
        requested_due_date=body.requested_due_date,
        note=body.note
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    return new_request

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
                out.admin_name = r.admin.name if r.admin else "Unknown Admin"
                out.user_name = r.user.name if r.user else "Unknown User"
                out.user_email = r.user.email if r.user else "N/A"
                out.course_title = r.course.title if r.course else "Untitled Course"
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
                out.admin_name = r.admin.name if r.admin else "Unknown Admin"
                out.user_name = r.user.name if r.user else "Unknown User"
                out.user_email = r.user.email if r.user else "N/A"
                out.course_title = r.course.title if r.course else "Untitled Course"
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
    current_user=Depends(require_roles(["hr", "admin"]))
):
    company_id = current_user.get("company_id")
    request = db.query(AssignmentRequest).join(Course).filter(
        AssignmentRequest.id == request_id,
        Course.company_id == company_id
    ).first()
    
    if not request: raise HTTPException(status_code=404, detail="Request not found")
    if request.status != "pending": raise HTTPException(status_code=400, detail="Request is already processed")
    
    # 1. Create Enrollment
    enrollment = Enrollment(
        user_id=request.user_id, 
        course_id=request.course_id,
        due_date=request.requested_due_date
    )
    db.add(enrollment)
    
    # 2. Update Request Status
    request.status = "approved"
    request.admin_id = current_user["id"]  # Set to the actual admin who approved
    
    db.commit()
    return {"message": "Assignment approved and user enrolled"}

@router.post("/assignments/{request_id}/reject")
def reject_assignment(
    request_id: int, 
    db: Session = Depends(get_db), 
    current_user=Depends(require_roles(["hr", "admin"]))
):
    company_id = current_user.get("company_id")
    request = db.query(AssignmentRequest).join(Course).filter(
        AssignmentRequest.id == request_id,
        Course.company_id == company_id
    ).first()
    
    if not request: raise HTTPException(status_code=404, detail="Request not found")
    if request.status != "pending": raise HTTPException(status_code=400, detail="Request is already processed")
    
    request.status = "rejected"
    db.commit()
    return {"message": "Assignment request rejected"}

@router.get("/assignments/count")
def get_pending_count(
    db: Session = Depends(get_db), 
    current_user=Depends(require_roles(["hr", "admin"]))
):
    company_id = current_user.get("company_id")
    count = db.query(AssignmentRequest).join(Course).filter(
        Course.company_id == company_id,
        AssignmentRequest.hr_id == current_user["id"],
        AssignmentRequest.status == "pending"
    ).count()
    return {"count": count}
