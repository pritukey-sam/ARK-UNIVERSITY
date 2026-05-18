from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from auth import hash_password, verify_password, generate_token, get_current_user, require_roles
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, text
from models import User, Course, Module, Video, Notes, Assignment, Quiz, Question, QuizAttempt, Submission, Enrollment, UserProgress, UserAnswer, ActivityLog
from upload_utils import save_file_locally
import shutil
import os
import time
import io
from datetime import datetime, timezone, timedelta
import pandas as pd
import json

router = APIRouter()

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class CreateUserRequest(BaseModel):
    email: str
    password: Optional[str] = None
    name: str
    role: str
    department: Optional[str] = "Engineering"
    employee_id: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    employee_id: Optional[str] = None
    is_active: Optional[bool] = None

class CreateCourseRequest(BaseModel):
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    completion_duration_days: Optional[int] = 30

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    curator_name: Optional[str] = None
    is_active: Optional[bool] = None
    completion_duration_days: Optional[int] = None

class AssignCourseRequest(BaseModel):
    course_id: int
    employee_id: int

class CreateModuleRequest(BaseModel):
    title: str
    description: Optional[str] = None
    order: int = 0

class AddVideoRequest(BaseModel):
    title: str
    video_url: str
    duration_seconds: int = 0
    description: Optional[str] = None

class QuestionCreate(BaseModel):
    type: str = "mcq"
    question_text: str
    options: Optional[str] = None
    correct_answer: str
    marks: int = 1
    explanation: Optional[str] = None

class CreateQuizRequest(BaseModel):
    title: str
    questions: List[QuestionCreate]

class QuizAnswer(BaseModel):
    question_id: int
    answer: str

class AttemptQuizRequest(BaseModel):
    answers: List[QuizAnswer]
    time_taken: int


# ── Auth ───────────────────────────────────────────────────────────────────────
@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    from models import Company
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    company = db.query(Company).filter(Company.id == user.company_id).first()
    if company:
        if company.status == "pending":
            raise HTTPException(status_code=403, detail="Your company account is pending approval.")
        if company.status == "rejected":
            raise HTTPException(status_code=403, detail="Your company registration request was rejected.")
            
    company_name = company.name if company else None
    plan_type = company.plan_type if company else "free"
    plan_price = company.plan_price if company else 0.0

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    token = generate_token(user.id, user.email, user.role, user.company_id)
    return {
        "token": token, 
        "user": {
            "id": user.id, 
            "email": user.email, 
            "name": user.name, 
            "role": user.role,
            "company_id": user.company_id,
            "company_name": company_name,
            "employee_id": user.employee_id,
            "plan_type": plan_type,
            "plan_price": plan_price,
            "payment_status": company.payment_status if company else "completed"
        }
    }


from services.id_service import generate_user_id
from dependencies import get_current_company_id

# ── Admin ──────────────────────────────────────────────────────────────────────
@router.post("/create-user")
def create_user(body: CreateUserRequest, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin", "hr", "super_admin"]))):
    try:
        company_id = current_user.get("company_id")
        
        # Validation for HR role
        if current_user["role"] == "hr" and body.role != "employee":
            raise HTTPException(status_code=403, detail="HR can only create employee accounts.")
            
        # Validation for Admin role
        if current_user["role"] == "admin" and body.role == "super_admin":
            raise HTTPException(status_code=403, detail="Admin cannot create super_admin accounts.")
        
        # Duplicate email check
        existing = db.query(User).filter(User.email == body.email).first()
        if existing:
            if not existing.is_active:
                # If user exists but is inactive, we could reactivate them or just throw error.
                # Reactivating is better for UX if they want to 're-add' the same person.
                # But for now, let's just throw error to keep it simple as requested.
                raise HTTPException(status_code=400, detail="A deactivated user with this email already exists. Please contact support to reactivate.")
            raise HTTPException(status_code=400, detail="User with this email already exists.")

        initials = "".join([n[0].upper() for n in body.name.split()[:2]])
        
        # Generate ID
        emp_id = generate_user_id(db, company_id, body.role)
        
        # Password auto-generation: First name (capitalized) + 123
        first_name = body.name.split()[0] if body.name.strip() else "User"
        generated_password = first_name.capitalize() + "123"
        
        user = User(
            email=body.email,
            password_hash=hash_password(generated_password),
            name=body.name,
            role=body.role,
            avatar_initials=initials,
            company_id=company_id,
            employee_id=body.employee_id or emp_id,
            department=body.department or "Engineering"
        )
        db.add(user)
        
        # Log Activity
        db.add(ActivityLog(
            company_id=company_id,
            user_id=current_user["id"],
            action="User Created",
            details=f"Added new {body.role}: {body.name} ({body.email})"
        ))
        
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/create-course")
def create_course(body: CreateCourseRequest, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    course = Course(
        title=body.title,
        description=body.description,
        thumbnail_url=body.thumbnail_url,
        created_by=current_user["id"],
        company_id=current_user.get("company_id"),
        completion_duration_days=body.completion_duration_days if body.completion_duration_days is not None else 30
    )
    print(f"DEBUG: Creating course with duration: {course.completion_duration_days}")
    db.add(course)
    
    # Log Activity
    db.add(ActivityLog(
        company_id=current_user.get("company_id"),
        user_id=current_user["id"],
        action="Course Created",
        details=f"Created new course: '{course.title}'"
    ))
    
    db.commit()
    db.refresh(course)
    return course

@router.put("/courses/{course_id}")
def update_course(course_id: int, body: CourseUpdate, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    company_id = current_user.get("company_id")
    course = db.query(Course).filter(Course.id == course_id, Course.company_id == company_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if body.title: course.title = body.title
    if body.description: course.description = body.description
    if body.thumbnail_url: course.thumbnail_url = body.thumbnail_url
    if body.curator_name: course.curator_name = body.curator_name
    if body.is_active is not None: course.is_active = body.is_active
    if body.completion_duration_days is not None: 
        course.completion_duration_days = body.completion_duration_days
    
    # Log Activity
    db.add(ActivityLog(
        company_id=company_id,
        user_id=current_user["id"],
        action="Course Updated",
        details=f"Updated course settings: '{course.title}'"
    ))
    
    db.commit()
    db.refresh(course)
    return course

@router.get("/users")
def get_users(db: Session = Depends(get_db), current_user=Depends(require_roles(["admin", "hr", "super_admin"]))):
    company_id = current_user.get("company_id")
    query = db.query(User).filter(User.is_active == True)
    
    if company_id:
        query = query.filter(User.company_id == company_id)
    
    # ROLE VISIBILITY FILTERING
    if current_user["role"] == "admin":
        query = query.filter(User.role != "super_admin")
    elif current_user["role"] == "hr":
        query = query.filter(User.role == "employee")
    
    users = query.all()
    results = []
    for u in users:
        # Get all enrollments for this user
        enrollments = db.query(Enrollment).options(joinedload(Enrollment.course)).filter(
            Enrollment.user_id == u.id
        ).all()
        
        assigned_courses = [e.course.title for e in enrollments if e.course and e.is_active]
        
        # Sort by enrolled_at to find the latest
        latest_enrollment = None
        if enrollments:
            latest_enrollment = max(enrollments, key=lambda e: e.enrolled_at if e.enrolled_at else datetime.min.replace(tzinfo=timezone.utc))
        
        # Get active courses count
        active_courses_count = len([e for e in enrollments if e.is_active and not e.is_completed])
        
        # Get who joined them (Joined By)
        joined_by_log = db.query(ActivityLog).filter(
            ActivityLog.action == "User Created",
            ActivityLog.details.like(f"%{u.email}%")
        ).first()
        
        joined_by_name = "System Admin"
        if joined_by_log:
            creator = db.query(User).filter(User.id == joined_by_log.user_id).first()
            if creator:
                joined_by_name = creator.name

        results.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "department": u.department or "Engineering",
            "active_courses_count": active_courses_count,
            "joined_by": joined_by_name,
            "employee_id": u.employee_id,
            "created_at": u.created_at,
            "avatar_initials": u.avatar_initials,
            "assigned_courses": assigned_courses,
            "latest_course": latest_enrollment.course.title if latest_enrollment and latest_enrollment.course else "Not Assigned",
            "assigned_at": latest_enrollment.enrolled_at if latest_enrollment else None
        })
    return results

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin", "super_admin"]))):
    # Safety checks
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")
        
    company_id = current_user.get("company_id")
    query = db.query(User).filter(User.id == user_id)
    if company_id:
        query = query.filter(User.company_id == company_id)
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.role == "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin accounts cannot be deleted.")
        
    # Soft delete
    user.is_active = False
    db.commit()
    
    # Log activity
    log = ActivityLog(
        company_id=current_user.get("company_id"),
        user_id=current_user["id"],
        action="User Deleted",
        details=f"Deactivated user: {user.name} ({user.email})"
    )
    db.add(log)
    db.commit()
    
    return {"message": "User deactivated successfully"}

@router.put("/users/{user_id}")
def update_user(user_id: int, body: UserUpdate, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin", "super_admin"]))):
    company_id = current_user.get("company_id")
    query = db.query(User).filter(User.id == user_id)
    if company_id:
        query = query.filter(User.company_id == company_id)
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if body.name: user.name = body.name
    if body.role: user.role = body.role
    if body.department: user.department = body.department
    if body.employee_id: user.employee_id = body.employee_id
    if body.is_active is not None: user.is_active = body.is_active
    
    # Log Activity
    db.add(ActivityLog(
        company_id=company_id,
        user_id=current_user["id"],
        action="User Updated",
        details=f"Updated profile for: {user.name} ({user.email})"
    ))
    
    db.commit()
    return {"message": "User updated successfully"}

@router.get("/users/{user_id}")
def get_user_details(user_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin", "hr", "super_admin"]))):
    # Ensure user belongs to the same company
    company_id = current_user.get("company_id")
    query = db.query(User).filter(User.id == user_id)
    if company_id:
        query = query.filter(User.company_id == company_id)
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Security: Prevent Admin from seeing Super Admin
    if current_user["role"] == "admin" and user.role == "super_admin":
        raise HTTPException(status_code=403, detail="Access denied: Cannot view Super Admin accounts")
    
    # Security: Prevent HR from seeing anyone but employees
    if current_user["role"] == "hr" and user.role != "employee":
        raise HTTPException(status_code=403, detail="Access denied: HR can only view Employee records")
        
    # Fetch Enrollments with Course details
    enrollments = db.query(Enrollment).options(joinedload(Enrollment.course)).filter(Enrollment.user_id == user_id).all()
    
    course_analytics = []
    total_assigned = len(enrollments)
    completed_count = 0
    in_progress_count = 0
    
    for e in enrollments:
        c = e.course
        total_modules = db.query(Module).filter(Module.course_id == c.id).count()
        progress_records = db.query(UserProgress).filter(
            UserProgress.user_id == user_id,
            UserProgress.course_id == c.id
        ).all()
        
        completed_modules = sum(1 for p in progress_records if p.is_completed)
        
        # Calculate last activity
        last_activity = e.updated_at or e.enrolled_at
        if progress_records:
            latest_p = max(progress_records, key=lambda x: x.updated_at or x.created_at)
            if latest_p.updated_at and (not last_activity or latest_p.updated_at > last_activity):
                last_activity = latest_p.updated_at
        
        status = "not_started"
        if completed_modules > 0:
            if completed_modules >= total_modules and total_modules > 0:
                status = "completed"
                completed_count += 1
            else:
                status = "in_progress"
                in_progress_count += 1
                
        # Expiry Check (Dynamic Calculation)
        due_date = e.enrolled_at + timedelta(days=c.completion_duration_days) if e.enrolled_at and c.completion_duration_days else None
        is_expired = False
        if due_date and status != "completed":
            due = due_date
            if due.tzinfo is None: due = due.replace(tzinfo=timezone.utc)
            if due < datetime.now(timezone.utc):
                status = "expired"
                is_expired = True

        # Efficiency Logic
        efficiency = "N/A"
        if status == "completed" and e.completed_at:
            duration = (e.completed_at - e.enrolled_at).days
            allowed = c.completion_duration_days or 30
            if duration <= allowed * 0.6: efficiency = "Fast Learner"
            elif duration <= allowed: efficiency = "On Time"
            else: efficiency = "Delayed"
        
        course_analytics.append({
            "course_id": c.id,
            "course_name": c.title,
            "thumbnail_url": c.thumbnail_url,
            "progress_percent": round((completed_modules / total_modules * 100), 1) if total_modules > 0 else 0,
            "completed_modules": completed_modules,
            "total_modules": total_modules,
            "last_activity": last_activity,
            "status": status,
            "assigned_at": e.enrolled_at,
            "due_date": due_date,
            "completed_at": e.completed_at,
            "efficiency": efficiency,
            "is_expired": is_expired,
            "completion_duration_days": c.completion_duration_days
        })

    # Fetch Activity Logs (Limit to 10)
    activities = db.query(ActivityLog).filter(ActivityLog.user_id == user_id).order_by(ActivityLog.created_at.desc()).limit(10).all()
    
    # Quiz Performance
    quiz_attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id).all()
    avg_score = 0
    if quiz_attempts:
        avg_score = sum(a.score for a in quiz_attempts) / len(quiz_attempts)
        
    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "employee_id": user.employee_id,
            "department": user.department or "Engineering",
            "avatar_initials": user.avatar_initials,
            "created_at": user.created_at,
            "last_login_at": user.last_login_at,
            "is_active": user.is_active,
            "joined_by": db.query(User.name).filter(User.id == db.query(ActivityLog.user_id).filter(ActivityLog.action == "User Created", ActivityLog.details.like(f"%{user.email}%")).limit(1).scalar_subquery()).scalar() or "System Admin"
        },
        "stats": {
            "total_assigned": total_assigned,
            "completed": completed_count,
            "in_progress": in_progress_count,
            "expired": sum(1 for c in course_analytics if c['is_expired']),
            "near_deadline": sum(1 for c in course_analytics if c['status'] == 'in_progress' and c.get('due_date') and (c['due_date'].replace(tzinfo=timezone.utc) if c['due_date'].tzinfo is None else c['due_date']) < datetime.now(timezone.utc) + timedelta(days=2)),
            "not_started": total_assigned - completed_count - in_progress_count,
            "avg_quiz_score": round(avg_score, 1),
            "total_quiz_attempts": len(quiz_attempts)
        },
        "course_analytics": course_analytics,
        "recent_activity": [
            {
                "action": a.action,
                "details": a.details,
                "created_at": a.created_at
            } for a in activities
        ]
    }

@router.post("/assign-course")
def assign_course(body: AssignCourseRequest, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin", "super_admin"]))):
    company_id = current_user.get("company_id")
    query = db.query(User).filter(User.id == body.employee_id)
    if company_id:
        query = query.filter(User.company_id == company_id)
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Security Check
    if current_user["role"] == "admin" and user.role == "super_admin":
        raise HTTPException(status_code=403, detail="Access denied: Cannot manage Super Admin accounts")
    if current_user["role"] == "hr" and user.role != "employee":
        raise HTTPException(status_code=403, detail="Access denied: HR can only manage Employee accounts")
    
    # Check if course exists
    course = db.query(Course).filter(Course.id == body.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Check if already enrolled
    existing = db.query(Enrollment).filter(
        Enrollment.user_id == body.employee_id,
        Enrollment.course_id == body.course_id
    ).first()
    
    if existing:
        # Re-assigning updates the due date (extensions) and ensures it is active
        existing.is_active = True
        new_due = datetime.now(timezone.utc) + timedelta(days=course.completion_duration_days)
        existing.due_date = new_due
        
        # Log Extension
        db.add(ActivityLog(
            company_id=company_id,
            user_id=current_user["id"],
            action="Course Extension",
            details=f"Extended deadline for '{course.title}' (User: {user.name})"
        ))
        
        db.commit()
        return {"message": f"Deadline for '{course.title}' extended to {existing.due_date.strftime('%d %b %Y')}"}

    due_date = datetime.now(timezone.utc) + timedelta(days=course.completion_duration_days)
    enrollment = Enrollment(
        user_id=body.employee_id, 
        course_id=body.course_id,
        due_date=due_date
    )
    db.add(enrollment)
    
    # Log Activity
    log = ActivityLog(
        company_id=current_user.get("company_id"),
        user_id=body.employee_id,
        action="Course Assigned",
        details=f"Assigned to '{course.title}' by {current_user.get('role', 'admin')}"
    )
    db.add(log)
    
    db.commit()
    
    return {"message": f"Course '{course.title}' assigned to {user.name} successfully"}



@router.get("/search")
def global_search(q: str = Query(..., min_length=1), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    search_term = f"%{q}%"
    company_id = current_user.get("company_id")
    
    # Search Courses
    course_query = db.query(Course).filter(
        Course.is_active == True,
        (Course.title.ilike(search_term)) | (Course.description.ilike(search_term))
    )
    if company_id:
        course_query = course_query.filter(Course.company_id == company_id)
    
    courses = course_query.limit(5).all()
    
    # Search Users (Admin/HR/SuperAdmin)
    users = []
    if current_user["role"] in ["admin", "hr", "super_admin"]:
        user_query = db.query(User).filter(
            (User.name.ilike(search_term)) | (User.email.ilike(search_term))
        )
        if company_id:
            user_query = user_query.filter(User.company_id == company_id)
        
        # ROLE VISIBILITY FILTERING
        if current_user["role"] == "admin":
            user_query = user_query.filter(User.role != "super_admin")
        elif current_user["role"] == "hr":
            user_query = user_query.filter(User.role == "employee")
            
        users = user_query.limit(5).all()
        
    return {
        "courses": [{"id": c.id, "title": c.title, "type": "course"} for c in courses],
        "users": [{"id": u.id, "name": u.name, "role": u.role, "type": "user"} for u in users]
    }

# ── HR ─────────────────────────────────────────────────────────────────────────
@router.get("/employee-progress")
def get_employee_progress(db: Session = Depends(get_db), current_user=Depends(require_roles(["hr", "admin", "super_admin"]))):
    # Fetch all enrollments with user and course info for the company
    company_id = current_user.get("company_id")
    query = db.query(
        Enrollment, User, Course
    ).join(User, Enrollment.user_id == User.id
    ).join(Course, Enrollment.course_id == Course.id
    )
    
    if company_id:
        query = query.filter(User.company_id == company_id)
    
    # ROLE VISIBILITY FILTERING
    if current_user["role"] == "admin":
        query = query.filter(User.role != "super_admin")
    elif current_user["role"] == "hr":
        query = query.filter(User.role == "employee")
        
    results = query.all()
    
    res = []
    for r in results:
        e = r.Enrollment
        u = r.User
        c = r.Course
        
        is_completed = db.query(UserProgress).filter(UserProgress.user_id == u.id, UserProgress.course_id == c.id, UserProgress.is_completed == True).first() is not None
        status = "completed" if is_completed else "in-progress"
        
        due_date = e.enrolled_at + timedelta(days=c.completion_duration_days) if e.enrolled_at and c.completion_duration_days else None
        is_overdue = False
        if due_date and not is_completed:
            due = due_date
            if due.tzinfo is None: due = due.replace(tzinfo=timezone.utc)
            is_overdue = due < datetime.now(timezone.utc)
        
        res.append({
            "employee_name": u.name,
            "employee_email": u.email,
            "course_title": c.title,
            "status": status,
            "assigned_at": e.enrolled_at.isoformat(),
            "due_date": due_date.isoformat() if due_date else None,
            "is_overdue": is_overdue,
            "completion_duration_days": c.completion_duration_days
        })
    return res


# ── Employee ───────────────────────────────────────────────────────────────────
@router.get("/my-courses")
def my_courses(db: Session = Depends(get_db), current_user=Depends(require_roles(["employee"]))):
    enrollments = db.query(Enrollment).options(joinedload(Enrollment.course)).filter(
        Enrollment.user_id == current_user["id"]
    ).all()
    
    results = []
    try:
        for e in enrollments:
            c = e.course
            if not c: continue
            
            total_modules = db.query(Module).filter(Module.course_id == c.id).count()
            completed_modules = db.query(UserProgress).filter(
                UserProgress.user_id == current_user["id"],
                UserProgress.course_id == c.id,
                UserProgress.is_completed == True
            ).count()
            
            status = "in_progress"
            if total_modules > 0 and completed_modules >= total_modules:
                status = "completed"
                
            total_duration = db.query(func.sum(Video.duration_seconds)).select_from(Module).join(Video).filter(Module.course_id == c.id).scalar() or 0
            
            # Due date calculations (Dynamic)
            completion_days = c.completion_duration_days or 30
            due_date = e.enrolled_at + timedelta(days=completion_days) if e.enrolled_at else None
            now = datetime.now(timezone.utc)
            remaining_days = None
            is_expired = False
            
            if due_date:
                due_compare = due_date
                if due_compare.tzinfo is None:
                    due_compare = due_compare.replace(tzinfo=timezone.utc)
                remaining_days = (due_compare - now).days
                if due_compare < now and status != "completed":
                    is_expired = True

            results.append({
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "thumbnail_url": c.thumbnail_url,
                "assigned_at": e.enrolled_at,
                "due_date": due_date,
                "remaining_days": remaining_days,
                "is_expired": is_expired,
                "status": "expired" if is_expired else status,
                "completed_modules": completed_modules,
                "total_modules": total_modules,
                "total_duration_seconds": int(total_duration),
                "completion_duration_days": completion_days
            })
    except Exception as e:
        print(f"Error in my_courses: {e}")
    return results

@router.post("/complete-course/{course_id}")
def complete_course(course_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(["employee"]))):
    # Verify all modules completed
    total_modules = db.query(Module).filter(Module.course_id == course_id).count()
    completed_modules = db.query(UserProgress).filter(
        UserProgress.user_id == current_user["id"],
        UserProgress.course_id == course_id,
        UserProgress.is_completed == True
    ).count()
    
    if total_modules == 0:
        raise HTTPException(status_code=400, detail="This course has no modules to complete")
        
    if completed_modules < total_modules:
        raise HTTPException(status_code=400, detail=f"Please complete all modules first ({completed_modules}/{total_modules} done)")

    # Update Enrollment status
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == current_user["id"],
        Enrollment.course_id == course_id
    ).first()
    
    if enrollment:
        enrollment.is_completed = True
        enrollment.completed_at = datetime.now(timezone.utc)
        db.commit()
    
    return {"message": "Course marked as completed!"}


# ── Stats ──────────────────────────────────────────────────────────────────────
@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        role = current_user["role"]
        company_id = current_user.get("company_id")
        stats = {}
        
        if role == "employee":
            uid = current_user["id"]
            total_enrolled = db.query(Enrollment).filter(Enrollment.user_id == uid).count()
            completed = db.query(Enrollment).filter(Enrollment.user_id == uid, Enrollment.is_completed == True).count()
            avg = db.query(func.avg(QuizAttempt.score)).filter(QuizAttempt.user_id == uid).scalar()
            
            stats = {
                "totalEnrolled": total_enrolled,
                "completedCourses": completed,
                "inProgress": max(0, total_enrolled - completed),
                "quizzesTaken": db.query(QuizAttempt).filter(QuizAttempt.user_id == uid).count(),
                "avgQuizScore": round(float(avg or 0), 1)
            }
        elif role in ["admin", "hr", "super_admin"]:
            user_q = db.query(User).filter(User.is_active == True)
            course_q = db.query(Course).filter(Course.is_active == True)
            enrollment_q = db.query(Enrollment).join(User, Enrollment.user_id == User.id).filter(User.is_active == True)
            
            if company_id:
                user_q = user_q.filter(User.company_id == company_id)
                course_q = course_q.filter(Course.company_id == company_id)
                enrollment_q = enrollment_q.filter(User.company_id == company_id)
            
            now = datetime.now(timezone.utc)
            
            total_users = user_q.count()
            total_courses = course_q.count()
            total_enrollments = enrollment_q.count()
            
            completed = enrollment_q.filter(Enrollment.is_completed == True).count()
            overdue = enrollment_q.filter(Enrollment.is_completed == False, Enrollment.due_date < now).count()
            near_expiry = enrollment_q.filter(
                Enrollment.is_completed == False, 
                Enrollment.due_date >= now, 
                Enrollment.due_date <= now + timedelta(days=7)
            ).count()
            
            stats = {
                "totalUsers": total_users,
                "totalCourses": total_courses,
                "totalEnrollments": total_enrollments,
                "totalAssignments": total_enrollments, # Alias for frontend compatibility
                "completedAssignments": completed,
                "overdueAssignments": overdue,
                "nearExpiryAssignments": near_expiry
            }
        return stats
    except Exception as e:
        print(f"Stats Error: {e}")
        return {"totalEnrolled": 0, "completedCourses": 0, "inProgress": 0}


@router.get("/dashboard/activity")
def get_activity_feed(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        company_id = current_user.get("company_id")
        
        # Pull directly from ActivityLog for the most accurate and inclusive feed
        query = db.query(ActivityLog).options(joinedload(ActivityLog.user))
        if company_id:
            query = query.filter(ActivityLog.company_id == company_id)
            
        logs = query.order_by(ActivityLog.created_at.desc()).limit(15).all()
        
        icon_map = {
            "User Created": "user",
            "User Updated": "user",
            "User Deleted": "user-x",
            "Course Created": "plus-circle",
            "Course Updated": "edit",
            "Course Assigned": "book-open",
            "Course Extension": "calendar",
            "Module Completed": "check-circle",
            "Course Completed": "award",
            "Video Completed": "play-circle",
            "Notes Viewed": "file-text",
            "Assignment Submitted": "upload-cloud",
            "Quiz Attempted": "target"
        }
        
        activities = []
        for l in logs:
            name = l.user.name if l.user else "System"
            activities.append({
                "type": l.action.lower().replace(" ", "_"),
                "message": f"{name}: {l.details}" if l.details else f"{name} performed {l.action}",
                "time": l.created_at,
                "icon": icon_map.get(l.action, "activity")
            })
            
        # Fallback to old logic only if no logs exist (legacy support)
        if not activities:
             # (Self-contained minimal fallback)
             users = db.query(User).filter(User.company_id == company_id).order_by(User.created_at.desc()).limit(5).all()
             for u in users:
                 activities.append({"type": "user_registered", "message": f"{u.name} joined", "time": u.created_at, "icon": "user"})
        
        return activities
    except Exception as e:
        print(f"Activity Feed Error: {e}")
        return []


# ── Helper for Access Expiry ──────────────────────────────────────────────────
def check_course_access(db: Session, user_id: int, course_id: int):
    # Check ANY enrollment record — consistent with /my-courses which also has no is_active filter
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == user_id,
        Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
        
    if enrollment.is_completed:
        return True  # Completed courses never expire

    # Only enforce expiry if course has a due_date set AND it's past due
    # (Don't block if due_date comes from completion_duration_days calc, only from explicit db field)
    if enrollment.due_date:
        due = enrollment.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        # Give a 3-day grace period to avoid false locks  
        if due < datetime.now(timezone.utc) - timedelta(days=3):
            raise HTTPException(
                status_code=403, 
                detail="Course access has expired. Please contact your administrator."
            )
    return True


# ── Modules ───────────────────────────────────────────────────────────────────

@router.post("/courses/{course_id}/modules")
def create_module(course_id: int, body: CreateModuleRequest, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    new_module = Module(course_id=course_id, title=body.title, description=body.description, order=body.order)
    db.add(new_module)
    db.commit()
    db.refresh(new_module)
    return new_module

@router.get("/courses/{course_id}/modules")
def get_modules(course_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        from models import Course
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        modules = db.query(Module).filter(Module.course_id == course_id).options(
            joinedload(Module.videos), joinedload(Module.notes),
            joinedload(Module.assignments), joinedload(Module.quizzes)
        ).order_by(Module.order).all()
        results = []
        for m in modules:
            results.append({
                "id": m.id, "course_id": m.course_id, "title": m.title,
                "description": m.description, "order": m.order,
                "videos": [{"id": v.id, "title": v.title, "video_url": v.video_url, "description": v.description, "duration_seconds": v.duration_seconds} for v in m.videos],
                "notes": [{"id": n.id, "file_url": n.file_url, "file_type": n.file_type} for n in m.notes],
                "assignments": [{"id": a.id, "title": a.title, "file_url": a.file_url} for a in m.assignments],
                "quizzes": [{"id": q.id, "title": q.title} for q in m.quizzes]
            })
        return results
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/modules/{module_id}")
def get_module(module_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
        
    # Check expiry for employees
    if current_user["role"] == "employee":
        check_course_access(db, current_user["id"], module.course_id)
        
    module = db.query(Module).filter(Module.id == module_id).options(
        joinedload(Module.videos), joinedload(Module.notes),
        joinedload(Module.assignments), joinedload(Module.quizzes).joinedload(Quiz.questions)
    ).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    try:
        total_seconds = sum(v.duration_seconds for v in module.videos)
        return {
            "id": module.id, "course_id": module.course_id, "title": module.title,
            "description": module.description, "order": module.order,
            "duration_seconds": total_seconds,
            "videos": [{"id": v.id, "title": v.title, "video_url": v.video_url, "duration_seconds": v.duration_seconds, "description": v.description} for v in module.videos],
            "notes": [{"id": n.id, "file_url": n.file_url, "file_type": n.file_type} for n in module.notes],
            "assignments": [{"id": a.id, "title": a.title, "file_url": a.file_url} for a in module.assignments],
            "quizzes": [{"id": q.id, "title": q.title, "question_count": len(q.questions)} for q in module.quizzes]
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/modules/{module_id}")
def delete_module(module_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    db.delete(module)
    db.commit()
    return {"message": "Module deleted successfully"}

@router.post("/modules/{module_id}/videos")
def add_video(module_id: int, body: AddVideoRequest, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    new_video = Video(
        module_id=module_id, 
        title=body.title, 
        video_url=body.video_url, 
        duration_seconds=body.duration_seconds,
        description=body.description
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    return {
        "id": new_video.id,
        "module_id": new_video.module_id,
        "title": new_video.title,
        "video_url": new_video.video_url,
        "duration_seconds": new_video.duration_seconds,
        "created_at": new_video.created_at
    }

@router.post("/modules/{module_id}/notes")
async def add_notes(module_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    # Local File Upload
    file_url = save_file_locally(file, folder="notes")
    if not file_url:
        raise HTTPException(status_code=500, detail="Failed to upload file to local storage")
        
    file_type = "pdf" if file.filename.endswith(".pdf") else "docx"
    new_notes = Notes(module_id=module_id, file_url=file_url, file_type=file_type)
    db.add(new_notes)
    db.commit()
    db.refresh(new_notes)
    return new_notes

@router.post("/modules/{module_id}/assignments")
async def add_assignment(module_id: int, title: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    # Local File Upload
    file_url = save_file_locally(file, folder="assignments")
    if not file_url:
        raise HTTPException(status_code=500, detail="Failed to upload assignment to local storage")
        
    new_assignment = Assignment(module_id=module_id, title=title, file_url=file_url)
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment

@router.delete("/videos/{video_id}")
def delete_video(video_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video: raise HTTPException(status_code=404, detail="Video not found")
    db.delete(video)
    db.commit()
    return {"message": "Video deleted"}

class UpdateVideoRequest(BaseModel):
    title: Optional[str] = None
    duration_seconds: Optional[int] = None
    video_url: Optional[str] = None
    description: Optional[str] = None

@router.put("/videos/{video_id}")
def update_video(video_id: int, body: UpdateVideoRequest, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video: raise HTTPException(status_code=404, detail="Video not found")
    if body.title is not None: video.title = body.title
    if body.duration_seconds is not None: video.duration_seconds = body.duration_seconds
    if body.video_url is not None: video.video_url = body.video_url
    if body.description is not None: video.description = body.description
    db.commit()
    db.refresh(video)
    return {"id": video.id, "title": video.title, "video_url": video.video_url, "duration_seconds": video.duration_seconds, "description": video.description}

@router.delete("/notes/{note_id}")
def delete_notes(note_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    note = db.query(Notes).filter(Notes.id == note_id).first()
    if not note: raise HTTPException(status_code=404, detail="Notes not found")
    db.delete(note)
    db.commit()
    return {"message": "Notes deleted"}

@router.delete("/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment: raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return {"message": "Assignment deleted"}

# ── Quizzes ───────────────────────────────────────────────────────────────────

@router.post("/modules/{module_id}/quizzes")
def create_quiz(module_id: int, body: CreateQuizRequest, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    if len(body.questions) == 0:
        raise HTTPException(status_code=400, detail="Quiz must have at least one question")
    new_quiz = Quiz(module_id=module_id, title=body.title)
    db.add(new_quiz)
    db.commit()
    db.refresh(new_quiz)
    for q in body.questions:
        question = Question(
            quiz_id=new_quiz.id, 
            type=q.type,
            question_text=q.question_text,
            options=q.options,
            correct_answer=q.correct_answer,
            marks=q.marks,
            explanation=q.explanation
        )
        db.add(question)
    db.commit()
    return {"id": new_quiz.id, "title": new_quiz.title, "questions_count": len(body.questions)}

@router.post("/modules/{module_id}/quizzes/bulk-preview")
async def bulk_preview_quiz(
    module_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user=Depends(require_roles(["admin"]))
):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read Excel file: {str(e)}")

    required_cols = ['question', 'type', 'correct_answer']
    for col in required_cols:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing required column: {col}")

    # Fetch existing questions in this module to prevent duplicates
    existing_questions = db.query(Question.question_text).join(Quiz).filter(Quiz.module_id == module_id).all()
    existing_texts = {q[0].strip().lower() for q in existing_questions}
    seen_in_file = set()

    preview_data = []
    import json

    for index, row in df.iterrows():
        try:
            if pd.isna(row['question']): continue

            q_text = str(row['question']).strip()
            q_type = str(row['type']).strip().lower()
            error = None

            # Check for duplicates (existing in DB or already seen in this file)
            q_text_lower = q_text.lower()
            if q_text_lower in existing_texts:
                error = "Duplicate question skipped (already exists in this module)"
            elif q_text_lower in seen_in_file:
                error = "Duplicate question skipped (appears multiple times in this file)"
            
            seen_in_file.add(q_text_lower)
            
            if q_type not in ['mcq', 'fill', 'short'] and not error:
                error = f"Invalid type '{q_type}'"

            options = []
            if q_type == 'mcq':
                for i in range(1, 6): # Support up to 5 options
                    col_name = f'option{i}'
                    if col_name in row and not pd.isna(row[col_name]):
                        options.append(str(row[col_name]).strip())
                
                if len(options) < 2 and not error:
                    error = "MCQ must have at least 2 options"
                elif len(options) > 5 and not error:
                    error = "MCQ can have maximum 5 options"

            # Correct Answer Parsing & Validation
            correct = row['correct_answer']
            if pd.notna(correct):
                # Convert float/int to clean string (e.g., 1.0 -> "1")
                if isinstance(correct, (int, float)):
                    correct = str(int(correct))
                else:
                    correct = str(correct).strip()
            else:
                correct = ""

            if not correct and not error:
                error = "Correct answer is required"
            
            if q_type == 'mcq' and not error:
                if not correct.isdigit():
                    error = "MCQ correct_answer must be a number (1-5)"
                else:
                    idx = int(correct)
                    if idx < 1 or idx > len(options):
                        error = f"MCQ correct_answer must be between 1 and {len(options)}"

            marks = 1
            if 'marks' in row and not pd.isna(row['marks']):
                try: marks = int(row['marks'])
                except: pass

            # Explanation
            explanation = str(row['explanation']).strip() if 'explanation' in row and not pd.isna(row['explanation']) else None

            # Resolve index to actual text for MCQs if it's a number
            if q_type == 'mcq' and not error:
                if correct.isdigit():
                    idx = int(correct) - 1 # Convert 1-based Excel to 0-based Array
                    if 0 <= idx < len(options):
                        correct = options[idx]
                    else:
                        error = f"Invalid option index {correct}. Must be between 1 and {len(options)}"

            preview_data.append({
                "question_text": q_text,
                "type": q_type,
                "options_list": options,
                "correct_answer": correct,
                "marks": marks,
                "explanation": explanation,
                "error": error
            })

        except Exception as e:
            preview_data.append({
                "question_text": str(row.get('question', 'Unknown')),
                "error": str(e)
            })

    return {"questions": preview_data}

@router.post("/modules/{module_id}/quizzes/bulk-confirm")
async def bulk_confirm_quiz(
    module_id: int, 
    body: dict, # List of validated questions
    db: Session = Depends(get_db), 
    current_user=Depends(require_roles(["admin"]))
):
    questions_data = body.get("questions", [])
    if not questions_data:
        raise HTTPException(status_code=400, detail="No questions provided")

    quiz_title = f"Bulk Upload - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    new_quiz = Quiz(module_id=module_id, title=quiz_title)
    db.add(new_quiz)
    db.flush()

    import json
    for q in questions_data:
        if q.get("error"): continue # Skip rows with errors

        new_q = Question(
            quiz_id=new_quiz.id,
            type=q["type"],
            question_text=q["question_text"],
            options=json.dumps(q["options_list"]) if q["type"] == 'mcq' else None,
            correct_answer=q["correct_answer"],
            marks=q.get("marks", 1),
            explanation=q.get("explanation")
        )
        db.add(new_q)

    db.commit()
    return {"id": new_quiz.id, "title": new_quiz.title, "questions_count": len(questions_data)}

@router.get("/quizzes/sample-template")
async def download_quiz_template(current_user=Depends(require_roles(["admin"]))):
    # Create sample data
    data = [
        {
            "question": "What is the capital of France?",
            "type": "mcq",
            "option1": "London",
            "option2": "Paris",
            "option3": "Berlin",
            "option4": "Madrid",
            "option5": "",
            "correct_answer": "2",
            "marks": 5,
            "explanation": "Paris is the capital and largest city of France.",
            "difficulty": "Easy",
            "topic": "Geography"
        },
        {
            "question": "The chemical symbol for water is ___.",
            "type": "fill",
            "option1": "", "option2": "", "option3": "", "option4": "", "option5": "",
            "correct_answer": "H2O",
            "marks": 2,
            "explanation": "Water is H2O.",
            "difficulty": "Easy",
            "topic": "Science"
        },
        {
            "question": "Briefly explain the theory of relativity.",
            "type": "short",
            "option1": "", "option2": "", "option3": "", "option4": "", "option5": "",
            "correct_answer": "Einstein's theory...",
            "marks": 10,
            "explanation": "Relativity...",
            "difficulty": "Hard",
            "topic": "Physics"
        }
    ]
    
    df = pd.DataFrame(data)
    
    # Save to buffer
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Quiz Template')
    
    output.seek(0)
    
    from fastapi.responses import StreamingResponse
    headers = {
        'Content-Disposition': 'attachment; filename="quiz_template.xlsx"'
    }
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@router.put("/quizzes/{quiz_id}")
def update_quiz(quiz_id: int, body: CreateQuizRequest, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Update title
    quiz.title = body.title
    
    # Remove existing student responses for these questions to avoid integrity errors
    db.query(UserAnswer).filter(UserAnswer.question_id.in_(db.query(Question.id).filter(Question.quiz_id == quiz_id))).delete(synchronize_session=False)
    
    # Remove existing questions
    db.query(Question).filter(Question.quiz_id == quiz_id).delete(synchronize_session=False)
    
    # Add new questions
    for q in body.questions:
        question = Question(
            quiz_id=quiz.id, 
            type=q.type,
            question_text=q.question_text,
            options=q.options,
            correct_answer=q.correct_answer,
            marks=q.marks,
            explanation=q.explanation
        )
        db.add(question)
        
    db.commit()
    return {"message": "Quiz updated successfully"}

@router.delete("/quizzes/{quiz_id}")
def delete_quiz(quiz_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz: raise HTTPException(status_code=404, detail="Quiz not found")
    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted"}

@router.get("/modules/{module_id}/quizzes")
def get_module_quizzes(module_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(Quiz).filter(Quiz.module_id == module_id).all()

@router.get("/quizzes/{quiz_id}")
def get_quiz(quiz_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).options(joinedload(Quiz.questions)).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    # Ensure questions are unique
    seen_q_ids = set()
    unique_questions = []
    for q in quiz.questions:
        if q.id not in seen_q_ids:
            unique_questions.append(q)
            seen_q_ids.add(q.id)

    quiz_data = {"id": quiz.id, "title": quiz.title, "questions": [
        {
            "id": q.id, 
            "type": q.type,
            "question_text": q.question_text, 
            "options": q.options,
            "marks": q.marks
        } for q in unique_questions
    ]}
    if current_user["role"] == "admin":
        for i, q in enumerate(unique_questions):
            quiz_data["questions"][i]["correct_answer"] = q.correct_answer
            quiz_data["questions"][i]["explanation"] = q.explanation
    return quiz_data

@router.post("/quizzes/{quiz_id}/attempt")
def attempt_quiz(quiz_id: int, body: AttemptQuizRequest, db: Session = Depends(get_db), current_user=Depends(require_roles(["employee", "admin"]))):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).options(joinedload(Quiz.questions)).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    total_marks = sum((q.marks if q.marks is not None else 1) for q in quiz.questions)
    earned_marks = 0.0
    question_map = {q.id: q for q in quiz.questions}
    
    user_answers_map = {}
    for ans in body.answers:
        if ans.question_id in question_map:
            q = question_map[ans.question_id]
            # Robust normalization function
            def normalize_text(val):
                if val is None: return ""
                import re
                # Convert to string, lowercase, and trim
                s = str(val).lower().strip()
                # Collapse multiple spaces into one
                s = re.sub(r'\s+', ' ', s)
                return s

            norm_user = normalize_text(ans.answer)
            norm_correct = normalize_text(q.correct_answer)
            is_correct = False

            # Evaluation logic
            if q.type == "mcq":
                # 1. Direct match (Text or Index)
                if norm_user == norm_correct:
                    is_correct = True
                else:
                    # 2. Try index-to-text resolution
                    try:
                        import json
                        options_list = json.loads(q.options) if q.options else []
                        
                        # Case A: Correct answer is index (e.g. "2"), User sent text (e.g. "Option B")
                        # Note: Excel imports use 1-based indexing
                        if norm_correct.isdigit():
                            idx = int(norm_correct) - 1 # Fix: Use 1-based indexing from Excel
                            if 0 <= idx < len(options_list):
                                if normalize_text(options_list[idx]) == norm_user:
                                    is_correct = True
                        
                        # Case B: Correct answer is text (e.g. "Option B"), User sent index (e.g. "2")
                        if not is_correct and norm_user.isdigit():
                            idx = int(norm_user) - 1 # Fix: Maintain consistency with 1-based indexing
                            if 0 <= idx < len(options_list):
                                if normalize_text(options_list[idx]) == norm_correct:
                                    is_correct = True
                    except:
                        pass
            else:
                # fill_blank, short, text, etc.
                is_correct = (norm_user == norm_correct)
            
            # DEBUG LOG
            print(f"[QUIZ DEBUG] QID: {q.id} | User: '{ans.answer}' (norm: '{norm_user}') | Correct: '{q.correct_answer}' (norm: '{norm_correct}') | Type: {q.type} | Match: {is_correct}")

            if is_correct:
                earned_marks += (q.marks if q.marks is not None else 1)
            
            # Avoid duplicate entries in result map if the same question is sent twice
            user_answers_map[ans.question_id] = {
                "answer": ans.answer,
                "is_correct": is_correct,
                "correct_answer": q.correct_answer,
                "explanation": q.explanation,
                "marks_earned": (q.marks if q.marks is not None else 1) if is_correct else 0
            }
        else:
            raise HTTPException(status_code=400, detail=f"Question ID {ans.question_id} not in this quiz")
    
    percentage = round((earned_marks / total_marks) * 100, 2) if total_marks > 0 else 0
    status = "PASSED" if percentage >= 60 else "FAILED"
    
    # Get previous attempts to set attempt_number
    prev_attempts_count = db.query(QuizAttempt).filter(
        QuizAttempt.user_id == current_user["id"],
        QuizAttempt.quiz_id == quiz_id
    ).count()
    
    import json
    attempt = QuizAttempt(
        user_id=current_user["id"], 
        quiz_id=quiz_id, 
        score=float(earned_marks), 
        total_marks=total_marks,
        percentage=percentage,
        status=status,
        attempt_number=prev_attempts_count + 1,
        answers=json.dumps(user_answers_map),
        time_taken=body.time_taken
    )
    db.add(attempt)
    db.flush() # Get attempt ID

    # Store individual answers in the new UserAnswer table
    for q_id, data in user_answers_map.items():
        user_ans = UserAnswer(
            attempt_id=attempt.id,
            question_id=q_id,
            answer=str(data["answer"]),
            is_correct=data["is_correct"],
            marks_earned=data["marks_earned"]
        )
        db.add(user_ans)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to save quiz attempt: {str(e)}")

    db.refresh(attempt)
    
    # Log Quiz Attempt
    log = ActivityLog(
        company_id=current_user.get("company_id"),
        user_id=current_user["id"],
        action="Quiz Attempted",
        details=f"Scored {percentage}% on '{quiz.title}'. Status: {status}"
    )
    db.add(log)
    
    # Sync with Module Progress if PASSED
    if status == "PASSED":
        try:
            module_id = quiz.module_id
            progress = db.query(UserProgress).filter(
                UserProgress.user_id == current_user["id"],
                UserProgress.module_id == module_id
            ).first()
            
            if progress:
                progress.quiz_completed = True
                # Check for all pillars
                has_notes = db.query(Notes).filter(Notes.module_id == module_id).first() is not None
                has_assignment = db.query(Assignment).filter(Assignment.module_id == module_id).first() is not None
                
                p1 = bool(progress.video_watched)
                p2 = bool(progress.notes_viewed) if has_notes else True
                p3 = bool(progress.assignment_submitted) if has_assignment else True
                p4 = True # Quiz just passed
                
                if p1 and p2 and p3 and p4 and not progress.is_completed:
                    progress.is_completed = True
                    progress.completed_at = datetime.now(timezone.utc)
                    db.add(ActivityLog(
                        company_id=current_user.get("company_id"),
                        user_id=current_user["id"],
                        action="Module Completed",
                        details=f"Successfully finished all requirements for module ID: {module_id}"
                    ))
            else:
                mod = db.query(Module).filter(Module.id == module_id).first()
                progress = UserProgress(
                    user_id=current_user["id"],
                    module_id=module_id,
                    course_id=mod.course_id if mod else 0,
                    quiz_completed=True
                )
                db.add(progress)
            
            db.commit()

            # ── SYNC WITH COURSE ENROLLMENT ─────────────────────────────────────
            if progress.is_completed:
                total_modules = db.query(Module).filter(Module.course_id == progress.course_id, Module.is_active == True).count()
                completed_modules = db.query(UserProgress).filter(
                    UserProgress.user_id == current_user["id"],
                    UserProgress.course_id == progress.course_id,
                    UserProgress.is_completed == True
                ).count()
                
                if total_modules > 0 and completed_modules >= total_modules:
                    enrollment = db.query(Enrollment).filter(
                        Enrollment.user_id == current_user["id"],
                        Enrollment.course_id == progress.course_id
                    ).first()
                    if enrollment and not enrollment.is_completed:
                        enrollment.is_completed = True
                        enrollment.completed_at = datetime.now(timezone.utc)
                        db.add(ActivityLog(
                            company_id=current_user.get("company_id"),
                            user_id=current_user["id"],
                            action="Course Completed",
                            details=f"Finished all modules in course ID: {progress.course_id}"
                        ))
                        db.commit()
        except Exception as e:
            print(f"Warning: Progress sync failed: {e}")
            db.rollback()
    
    return {
        "id": attempt.id,
        "score": attempt.score, 
        "total_marks": attempt.total_marks, 
        "percentage": attempt.percentage,
        "status": attempt.status,
        "attempt_number": attempt.attempt_number,
        "attempted_at": attempt.attempted_at,
        "time_taken": attempt.time_taken,
        "results": user_answers_map
    }

# ── Submissions ───────────────────────────────────────────────────────────────

@router.post("/modules/{module_id}/submit")
async def submit_assignment(module_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(require_roles(["employee", "admin"]))):
    allowed_extensions = [".zip", ".rar", ".7z", ".pdf", ".doc", ".docx", ".txt", ".ppt", ".pptx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"]
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a standard document, image, or archive.")
    
    # Local File Upload
    file_url = save_file_locally(file, folder="submissions")
    if not file_url:
        raise HTTPException(status_code=500, detail="Failed to upload submission to local storage")
        
    new_submission = Submission(user_id=current_user["id"], module_id=module_id, file_url=file_url)
    db.add(new_submission)
    
    # Update Progress
    progress = db.query(UserProgress).filter(
        UserProgress.user_id == current_user["id"],
        UserProgress.module_id == module_id
    ).first()
    
    if not progress:
        mod = db.query(Module).filter(Module.id == module_id).first()
        progress = UserProgress(
            user_id=current_user["id"],
            module_id=module_id,
            course_id=mod.course_id if mod else 0,
            assignment_submitted=True
        )
        db.add(progress)
    else:
        progress.assignment_submitted = True
    
    # Log Activity
    db.add(ActivityLog(
        company_id=current_user.get("company_id"),
        user_id=current_user["id"],
        action="Assignment Submitted",
        details=f"Uploaded assignment for module ID: {module_id}"
    ))
    
    # Check for all pillars
    has_notes = db.query(Notes).filter(Notes.module_id == module_id).first() is not None
    has_quiz = db.query(Quiz).filter(Quiz.module_id == module_id).first() is not None
    
    p1 = bool(progress.video_watched)
    p2 = bool(progress.notes_viewed) if has_notes else True
    p3 = True # Assignment just submitted
    p4 = bool(progress.quiz_completed) if has_quiz else True
    
    if p1 and p2 and p3 and p4 and not progress.is_completed:
        progress.is_completed = True
        progress.completed_at = datetime.now(timezone.utc)
        db.add(ActivityLog(
            company_id=current_user.get("company_id"),
            user_id=current_user["id"],
            action="Module Completed",
            details=f"Successfully finished all requirements for module ID: {module_id}"
        ))

    db.commit()

    # ── SYNC WITH COURSE ENROLLMENT ─────────────────────────────────────
    if progress.is_completed:
        total_modules = db.query(Module).filter(Module.course_id == progress.course_id, Module.is_active == True).count()
        completed_modules = db.query(UserProgress).filter(
            UserProgress.user_id == current_user["id"],
            UserProgress.course_id == progress.course_id,
            UserProgress.is_completed == True
        ).count()
        
        if total_modules > 0 and completed_modules >= total_modules:
            enrollment = db.query(Enrollment).filter(
                Enrollment.user_id == current_user["id"],
                Enrollment.course_id == progress.course_id
            ).first()
            if enrollment and not enrollment.is_completed:
                enrollment.is_completed = True
                enrollment.completed_at = datetime.now(timezone.utc)
                db.add(ActivityLog(
                    company_id=current_user.get("company_id"),
                    user_id=current_user["id"],
                    action="Course Completed",
                    details=f"Finished all modules in course ID: {progress.course_id}"
                ))
                db.commit()

    # Log Activity for submission
    log = ActivityLog(
        company_id=current_user.get("company_id"),
        user_id=current_user["id"],
        action="Assignment Submitted",
        details=f"Uploaded solution for module ID: {module_id}"
    )
    db.add(log)
    db.commit()
    
    db.commit()
    db.refresh(new_submission)
    return {"message": "Assignment submitted successfully", "submission_id": new_submission.id, "file_url": file_url}

@router.get("/submissions")
def get_all_submissions(current_user=Depends(require_roles(["admin", "hr", "super_admin"])), db: Session = Depends(get_db)):
    company_id = current_user.get("company_id")
    query = db.query(Submission).join(User)
    
    if company_id:
        query = query.filter(User.company_id == company_id)
    
    # ROLE VISIBILITY FILTERING
    if current_user["role"] == "admin":
        query = query.filter(User.role != "super_admin")
    elif current_user["role"] == "hr":
        query = query.filter(User.role == "employee")
        
    submissions = query.options(joinedload(Submission.user), joinedload(Submission.module)).all()
    return [{"id": s.id, "user_name": s.user.name, "user_email": s.user.email,
             "module_title": s.module.title, "file_url": s.file_url, "submitted_at": s.submitted_at} for s in submissions]

@router.get("/my-submissions")
def get_my_submissions(current_user=Depends(require_roles(["employee", "admin"])), db: Session = Depends(get_db)):
    submissions = db.query(Submission).filter(Submission.user_id == current_user["id"]).options(joinedload(Submission.module)).all()
    return [{"id": s.id, "module_title": s.module.title, "file_url": s.file_url, "submitted_at": s.submitted_at} for s in submissions]
@router.delete("/submissions/{submission_id}")
def delete_submission(submission_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin", "hr"]))):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission: raise HTTPException(status_code=404, detail="Submission not found")
    db.delete(submission)
    db.commit()
    return {"message": "Submission deleted"}
