from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Request
from validation import validate_and_log_upload, validate_video_url
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import List, Optional
from database import get_db, log_audit_event
from models import Course, Module, Enrollment, UserProgress, User, Video, Notes, Quiz, Assignment, Question, UserVideoProgress, QuizAttempt, UserAnswer, AssignmentRequest, Submission, CourseAccessRequest
from schemas import (
    CourseOut, CourseListOut, CourseCreate, CourseUpdate, CourseProgress, CourseStatsOut,
    VideoCreate, VideoOut, QuizCreate, QuizOut, ModuleUpdate, ModuleOut
)
from upload_utils import save_file_locally
from auth import get_current_user, require_roles
from r2_utils import generate_signed_url
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/courses", tags=["Courses"])


# ── HELPER: compute progress for a user on a course ────────────────────────
def compute_progress(db: Session, user_id: int, course_id: int, total_modules: int) -> CourseProgress:
    if not total_modules or total_modules <= 0:
        return CourseProgress(
            progress_percent=0,
            completed_modules=0,
            total_modules=0,
            status="not_started"
        )

    try:
        completed = db.query(UserProgress).filter(
            UserProgress.user_id == user_id,
            UserProgress.course_id == course_id,
            UserProgress.is_completed == True
        ).count() or 0

        percent = round((completed / total_modules) * 100) if total_modules > 0 else 0
        percent = min(100, max(0, percent)) # Bound between 0-100

        if percent >= 100:
            status = "completed"
        elif percent > 0:
            status = "in_progress"
        else:
            status = "not_started"

        return CourseProgress(
            progress_percent=percent,
            completed_modules=completed,
            total_modules=total_modules,
            status=status
        )
    except Exception as e:
        print(f"Error in compute_progress: {e}")
        return CourseProgress(
            progress_percent=0, 
            completed_modules=0, 
            total_modules=max(0, total_modules), 
            status="not_started"
        )


# ── GET ALL COURSES (with search, filter, sort) ────────────────────────────
@router.get("", response_model=List[CourseListOut])
def get_courses(
    q: Optional[str] = Query(None, description="Search query"),
    status: Optional[str] = Query(None, description="Filter: completed | in_progress | not_started | my"),
    sort: Optional[str] = Query("newest", description="Sort: newest | oldest | alpha | progress"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = current_user["id"]
    company_id = current_user.get("company_id")

    query = db.query(Course).filter(Course.is_active == True)
    if company_id:
        query = query.filter(Course.company_id == company_id)

    # ── SEARCH ──
    if q and q.strip():
        search_term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Course.title.ilike(search_term),
                Course.description.ilike(search_term)
            )
        )

    # ── SORT (before filter for efficiency) ──
    if sort == "oldest":
        query = query.order_by(Course.created_at.asc())
    elif sort == "alpha":
        query = query.order_by(Course.title.asc())
    else:  # newest (default)
        query = query.order_by(Course.created_at.desc())

    try:
        courses = query.all()

        # ── BUILD RESPONSE WITH PROGRESS ──
        user_enrollments = {
            e.course_id: e for e in db.query(Enrollment).filter(
                Enrollment.user_id == user_id,
                Enrollment.is_active == True
            ).all()
        }

        user_requests = {
            r.course_id: r.status for r in db.query(CourseAccessRequest).filter(
                CourseAccessRequest.user_id == user_id
            ).all()
        }

        result = []
        for course in courses:
            module_stats = db.query(
                func.count(Module.id.distinct()),
                func.sum(Video.duration_seconds)
            ).select_from(Module).outerjoin(Video).filter(
                Module.course_id == course.id,
                Module.is_active == True
            ).first()

            total_modules = module_stats[0] or 0
            total_duration_seconds = module_stats[1] or 0

            progress = compute_progress(db, user_id, course.id, total_modules)
            enrollment = user_enrollments.get(course.id)
            is_enrolled = enrollment is not None
            
            due_date = None
            is_overdue = False
            assigned_at = None
            
            if enrollment:
                assigned_at = enrollment.enrolled_at
                if assigned_at and course.completion_duration_days:
                    due_date = assigned_at + timedelta(days=course.completion_duration_days)
                    # Ensure timezone awareness for comparison
                    due_compare = due_date
                    if due_compare.tzinfo is None: due_compare = due_compare.replace(tzinfo=timezone.utc)
                    now = datetime.now(timezone.utc)
                    is_overdue = due_compare < now and not enrollment.is_completed

            # ── FILTER BY STATUS ──
            if status == "my" and not is_enrolled:
                continue
            if status == "completed" and progress.status != "completed":
                continue
            if status == "in_progress" and progress.status != "in_progress":
                continue
            if status == "not_started" and progress.status != "not_started":
                continue

            result.append(CourseListOut(
                id=course.id,
                title=course.title,
                description=course.description,
                thumbnail_url=course.thumbnail_url,
                curator_name=course.curator_name,
                curator_initials=course.curator_initials,
                course_number=course.course_number,
                is_active=course.is_active,
                created_at=course.created_at,
                updated_at=course.updated_at,
                progress=progress,
                is_enrolled=is_enrolled,
                total_modules=total_modules,
                total_duration_seconds=total_duration_seconds,
                completion_duration_days=course.completion_duration_days,
                due_date=due_date,
                is_overdue=is_overdue,
                assigned_at=assigned_at,
                access_request_status=user_requests.get(course.id)
            ))

        # ── SORT BY PROGRESS (post-compute) ──
        if sort == "progress":
            result.sort(key=lambda x: x.progress.progress_percent if x.progress else 0, reverse=True)

        return result
    except Exception as e:
        print(f"GET COURSES ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── CHECK COURSE ACCESS (for frontend enrollment validation) ──────────────
@router.get("/{course_id}/check-access")
def check_course_access_endpoint(course_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Returns enrollment status. 200 = has access, 403 = no access."""
    user_id = current_user["id"]
    role = current_user.get("role", "employee")

    # Admins always have access
    if role in ["admin", "super_admin", "hr"]:
        return {"enrolled": True, "role": role}

    # Check enrollment (any enrollment record = access)
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == user_id,
        Enrollment.course_id == course_id
    ).first()

    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")

    return {
        "enrolled": True,
        "is_completed": enrollment.is_completed,
        "enrolled_at": enrollment.enrolled_at
    }


# ── GET SIGNED VIDEO URL ───────────────────────────────────────────────────
@router.get("/video-url/{video_id}")
def get_video_url(video_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    company_id = current_user.get("company_id")
    role = current_user.get("role", "employee")

    # Get video
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Fetch module and verify company
    module = db.query(Module).join(Course).filter(Module.id == video.module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
        
    course = db.query(Course).filter(Course.id == module.course_id).first()
    # Company check: allow if same company OR super_admin OR no company set
    if company_id and course.company_id and course.company_id != company_id and role != "super_admin":
        raise HTTPException(status_code=403, detail="Module does not belong to your company")

    # Verify enrollment if employee — check ANY enrollment (not just is_active)
    if role == "employee":
        enrollment = db.query(Enrollment).filter(
            Enrollment.user_id == user_id, 
            Enrollment.course_id == module.course_id
        ).first()
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")

    # If it's a YouTube URL, just return it
    if "youtube.com" in video.video_url or "youtu.be" in video.video_url:
        return {"video_url": video.video_url}

    # Extract file key if the URL contains a domain
    file_key = video.video_url
    if 'http' in file_key:
        from urllib.parse import urlparse
        # Extract the path from the URL and remove leading slash
        file_key = urlparse(file_key).path.lstrip('/')

    # Generate signed URL for R2 key
    try:
        signed_url = generate_signed_url(file_key)
        return {"video_url": signed_url}
    except Exception as e:
        print(f"R2 Error for key {file_key}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate secure video stream")


# ── SEARCH ENDPOINT ────────────────────────────────────────────────────────
@router.get("/search", response_model=List[CourseListOut])
def search_courses(
    q: str = Query(..., min_length=1, description="Search query"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return get_courses(q=q, status=None, sort="newest", db=db, current_user=current_user)


# ── GET COURSE STATS ───────────────────────────────────────────────────────
@router.get("/stats", response_model=CourseStatsOut)
def get_course_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    company_id = current_user.get("company_id")

    query = db.query(Course).filter(Course.is_active == True)
    if company_id:
        query = query.filter(Course.company_id == company_id)
    total_courses = query.count()

    enrolled_ids = {
        e.course_id for e in db.query(Enrollment).filter(
            Enrollment.user_id == user_id,
            Enrollment.is_active == True
        ).all()
    }

    completed = in_progress = not_started = 0

    for course_id in enrolled_ids:
        total_mods = db.query(func.count(Module.id)).filter(
            Module.course_id == course_id,
            Module.is_active == True
        ).scalar()
        p = compute_progress(db, user_id, course_id, total_mods)
        if p.status == "completed":
            completed += 1
        elif p.status == "in_progress":
            in_progress += 1
        else:
            not_started += 1

    return CourseStatsOut(
        total_courses=total_courses,
        enrolled_courses=len(enrolled_ids),
        completed_courses=completed,
        in_progress_courses=in_progress,
        not_started_courses=not_started
    )


# ── GET SINGLE COURSE (with modules + progress) ────────────────────────────
@router.get("/{course_id}", response_model=CourseOut)
def get_course(course_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        user_id = current_user["id"]
        company_id = current_user.get("company_id")

        query = db.query(Course).options(
            joinedload(Course.modules)
        ).filter(Course.id == course_id, Course.is_active == True)
        
        if company_id:
            query = query.filter(Course.company_id == company_id)
            
        course = query.first()
        if course:
            print(f"DEBUG: Fetched course {course_id} - Duration in DB: {course.completion_duration_days}")

        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        active_modules = sorted(
            [m for m in course.modules if m.is_active],
            key=lambda m: m.order_index
        )

        total_modules = len(active_modules)
        progress = compute_progress(db, user_id, course_id, total_modules)

        enrollment = db.query(Enrollment).filter(
            Enrollment.user_id == user_id,
            Enrollment.course_id == course_id,
            Enrollment.is_active == True
        ).first()
        is_enrolled = enrollment is not None
        
        # Check course access request status
        access_req = db.query(CourseAccessRequest).filter(
            CourseAccessRequest.user_id == user_id,
            CourseAccessRequest.course_id == course_id
        ).first()
        access_request_status = access_req.status if access_req else None

        due_date = None
        is_overdue = False
        assigned_at = None
        
        if enrollment:
            assigned_at = enrollment.enrolled_at
            if assigned_at and course.completion_duration_days:
                due_date = assigned_at + timedelta(days=course.completion_duration_days)
                due_compare = due_date
                if due_compare.tzinfo is None: due_compare = due_compare.replace(tzinfo=timezone.utc)
                now = datetime.now(timezone.utc)
                is_overdue = due_compare < now and not enrollment.is_completed

        completed_module_ids = {
            p.module_id for p in db.query(UserProgress).filter(
                UserProgress.user_id == user_id,
                UserProgress.course_id == course_id,
                UserProgress.is_completed == True
            ).all()
        }

        modules_out = []
        resume_module_id = None
        course_total_duration = 0
        
        for m in active_modules:
            is_completed = m.id in completed_module_ids
            
            # Get content counts and duration
            video_stats = db.query(
                func.count(Video.id),
                func.sum(Video.duration_seconds)
            ).filter(Video.module_id == m.id).first()
            
            video_count = video_stats[0] or 0
            total_seconds = video_stats[1] or 0
            course_total_duration += total_seconds
            duration_minutes = int(total_seconds / 60)

            note_count = db.query(func.count(Notes.id)).filter(Notes.module_id == m.id).scalar()
            quiz_count = db.query(func.count(Quiz.id)).filter(Quiz.module_id == m.id).scalar()
            assignment_count = db.query(func.count(Assignment.id)).filter(Assignment.module_id == m.id).scalar()

            if not is_completed and resume_module_id is None and is_enrolled:
                resume_module_id = m.id

            mod = ModuleOut(
                id=m.id,
                course_id=m.course_id,
                title=m.title,
                description=m.description,
                duration_minutes=duration_minutes,
                order_index=m.order_index,
                is_completed=is_completed,
                video_count=video_count,
                note_count=note_count,
                quiz_count=quiz_count,
                assignment_count=assignment_count,
                duration_seconds=total_seconds,
                created_at=m.created_at
            )
            modules_out.append(mod)

        return CourseOut(
            id=course.id,
            title=course.title,
            description=course.description,
            thumbnail_url=course.thumbnail_url,
            curator_name=course.curator_name,
            curator_initials=course.curator_initials,
            course_number=course.course_number,
            is_active=course.is_active,
            created_at=course.created_at,
            updated_at=course.updated_at,
            progress=progress,
            is_enrolled=is_enrolled,
            total_duration_seconds=course_total_duration,
            resume_module_id=resume_module_id,
            completion_duration_days=course.completion_duration_days,
            due_date=due_date,
            is_overdue=is_overdue,
            assigned_at=assigned_at,
            access_request_status=access_request_status,
            modules=modules_out
        )
    except Exception as e:
        print(f"Error in get_course: {e}")
        import traceback
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    company_id = current_user.get("company_id")
    query = db.query(Course).filter(Course.id == course_id)
    if company_id:
        query = query.filter(Course.company_id == company_id)
    course = query.first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    try:
        # 1. Delete all Assignment Requests for this course
        db.query(AssignmentRequest).filter(AssignmentRequest.course_id == course_id).delete(synchronize_session=False)

        # 2. Delete all Enrollments for this course
        db.query(Enrollment).filter(Enrollment.course_id == course_id).delete(synchronize_session=False)

        # 3. Delete all UserProgress records for this course
        db.query(UserProgress).filter(UserProgress.course_id == course_id).delete(synchronize_session=False)

        # 4. Find all modules for this course
        modules = db.query(Module).filter(Module.course_id == course_id).all()
        module_ids = [m.id for m in modules]

        if module_ids:
            # 5. Delete Submissions
            db.query(Submission).filter(Submission.module_id.in_(module_ids)).delete(synchronize_session=False)

            # 6. Delete Assignments
            db.query(Assignment).filter(Assignment.module_id.in_(module_ids)).delete(synchronize_session=False)

            # 7. Delete Notes
            db.query(Notes).filter(Notes.module_id.in_(module_ids)).delete(synchronize_session=False)

            # 8. Find all videos for these modules
            videos = db.query(Video).filter(Video.module_id.in_(module_ids)).all()
            video_ids = [v.id for v in videos]
            if video_ids:
                # 9. Delete UserVideoProgress
                db.query(UserVideoProgress).filter(UserVideoProgress.video_id.in_(video_ids)).delete(synchronize_session=False)
                # 10. Delete Videos
                db.query(Video).filter(Video.id.in_(video_ids)).delete(synchronize_session=False)

            # 11. Find all quizzes for these modules
            quizzes = db.query(Quiz).filter(Quiz.module_id.in_(module_ids)).all()
            quiz_ids = [q.id for q in quizzes]
            if quiz_ids:
                # 12. Find questions and attempts
                questions = db.query(Question).filter(Question.quiz_id.in_(quiz_ids)).all()
                question_ids = [q.id for q in questions]

                attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id.in_(quiz_ids)).all()
                attempt_ids = [a.id for a in attempts]

                # 13. Delete UserAnswers
                if attempt_ids or question_ids:
                    ua_query = db.query(UserAnswer)
                    if attempt_ids and question_ids:
                        ua_query = ua_query.filter((UserAnswer.attempt_id.in_(attempt_ids)) | (UserAnswer.question_id.in_(question_ids)))
                    elif attempt_ids:
                        ua_query = ua_query.filter(UserAnswer.attempt_id.in_(attempt_ids))
                    else:
                        ua_query = ua_query.filter(UserAnswer.question_id.in_(question_ids))
                    ua_query.delete(synchronize_session=False)

                # 14. Delete QuizAttempts
                if attempt_ids:
                    db.query(QuizAttempt).filter(QuizAttempt.id.in_(attempt_ids)).delete(synchronize_session=False)

                # 15. Delete Questions
                if question_ids:
                    db.query(Question).filter(Question.id.in_(question_ids)).delete(synchronize_session=False)

                # 16. Delete Quizzes
                db.query(Quiz).filter(Quiz.id.in_(quiz_ids)).delete(synchronize_session=False)

            # 17. Delete Modules
            db.query(Module).filter(Module.id.in_(module_ids)).delete(synchronize_session=False)

        # 18. Finally delete the Course
        course_title = course.title
        db.delete(course)
        db.commit()
        log_audit_event(db, "Course Deleted", current_user["id"], course_title, f"Deleted course: '{course_title}' and all associated enrollments", company_id)
        return {"message": "Course deleted successfully"}

    except Exception as e:
        db.rollback()
        print(f"Error deleting course {course_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Course deletion failed: {str(e)}")


# ── CREATE COURSE ──────────────────────────────────────────────────────────
@router.post("", response_model=CourseOut)
def create_course(payload: CourseCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    company_id = current_user.get("company_id")
    course = Course(**payload.dict(), company_id=company_id, created_by=current_user["id"])
    db.add(course)
    db.commit()
    log_audit_event(db, "Course Created", current_user["id"], course.title, f"Created new course: '{course.title}'", company_id)
    db.refresh(course)
    return get_course(course.id, db, current_user)


# ── ENROLL IN COURSE ───────────────────────────────────────────────────────
@router.post("/{course_id}/enroll")
def enroll_course(course_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    company_id = current_user.get("company_id")

    if current_user.get("role") == "employee":
        raise HTTPException(
            status_code=403,
            detail="Direct enrollment is disabled. Please request access through the Available Courses section."
        )

    query = db.query(Course).filter(Course.id == course_id)
    if company_id:
        query = query.filter(Course.company_id == company_id)
    course = query.first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    existing = db.query(Enrollment).filter(
        Enrollment.user_id == user_id,
        Enrollment.course_id == course_id
    ).first()

    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
        return {"message": "Already enrolled", "enrolled": True}

    try:
        enrollment = Enrollment(user_id=user_id, course_id=course_id)
        db.add(enrollment)
        db.commit()
        return {"message": "Enrolled successfully", "enrolled": True}
    except Exception as e:
        db.rollback()
        print(f"ENROLL ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Enrollment failed: {str(e)}")


# ── MODULE CONTENT MANAGEMENT (Admin Only) ───────────────────────────────────

@router.post("/modules/{module_id}/videos", response_model=VideoOut)
def add_video(module_id: int, payload: VideoCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    # Verify module belongs to a course in the admin's company
    company_id = current_user.get("company_id")
    module = db.query(Module).join(Course).filter(Module.id == module_id, Course.company_id == company_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
        
    try:
        validate_video_url(payload.video_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    video = Video(module_id=module_id, title=payload.title, video_url=payload.video_url)
    db.add(video)
    db.commit()
    db.refresh(video)
    return video

@router.post("/modules/{module_id}/notes")
def add_notes(module_id: int, request: Request, file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    company_id = current_user.get("company_id")
    module = db.query(Module).join(Course).filter(Module.id == module_id, Course.company_id == company_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    validate_and_log_upload(file, "document", db, request, current_user, "notes")

    file_url = save_file_locally(file, folder="notes")
    if not file_url:
        raise HTTPException(status_code=500, detail="Failed to save file")
    
    note = Notes(module_id=module_id, file_url=file_url, file_type="pdf")
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"message": "Notes uploaded successfully", "url": file_url}

@router.post("/modules/{module_id}/assignments")
def add_assignment(module_id: int, request: Request, title: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    company_id = current_user.get("company_id")
    module = db.query(Module).join(Course).filter(Module.id == module_id, Course.company_id == company_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    validate_and_log_upload(file, "document", db, request, current_user, "assignments")

    file_url = save_file_locally(file, folder="assignments")
    if not file_url:
        raise HTTPException(status_code=500, detail="Failed to save file")
    
    assignment = Assignment(module_id=module_id, title=title, file_url=file_url)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {"message": "Assignment uploaded successfully", "url": file_url}

@router.post("/modules/{module_id}/quizzes", response_model=QuizOut)
def create_quiz(module_id: int, payload: QuizCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    company_id = current_user.get("company_id")
    module = db.query(Module).join(Course).filter(Module.id == module_id, Course.company_id == company_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    quiz = Quiz(module_id=module_id, title=payload.title)
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    
    for q in payload.questions:
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
    db.refresh(quiz)
    return quiz

@router.put("/modules/{module_id}")
def update_module(module_id: int, payload: ModuleUpdate, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))) :
    company_id = current_user.get("company_id")
    module = db.query(Module).join(Course).filter(Module.id == module_id, Course.company_id == company_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    if payload.title is not None:
        module.title = payload.title
    if payload.description is not None:
        module.description = payload.description
    if payload.order_index is not None:
        module.order_index = payload.order_index
    
    db.commit()
    db.refresh(module)
    return module
