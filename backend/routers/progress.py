from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime, timezone
from database import get_db
from models import UserProgress, Module, Course, User, Video, UserVideoProgress
from schemas import MarkModuleComplete, ProgressOut, CourseProgress, ModuleProgressDetail, ModuleProgressUpdate, VideoProgressUpdate, UserVideoProgressOut
from auth import get_current_user, require_roles

router = APIRouter(prefix="/progress", tags=["Progress"])


# ── MARK MODULE AS COMPLETE ────────────────────────────────────────────────
@router.post("/complete", response_model=ProgressOut)
def mark_module_complete(payload: MarkModuleComplete, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]

    company_id = current_user.get("company_id")
    # Verify course exists and belongs to company (if tenant-bound)
    query = db.query(Course).filter(Course.id == payload.course_id)
    if company_id:
        query = query.filter(Course.company_id == company_id)
    
    course = query.first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")

    module = db.query(Module).filter(Module.id == payload.module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    existing = db.query(UserProgress).filter(
        UserProgress.user_id == user_id,
        UserProgress.module_id == payload.module_id,
        UserProgress.course_id == payload.course_id
    ).first()

    if existing:
        existing.is_completed = True
        existing.completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing

    progress = UserProgress(
        user_id=user_id,
        module_id=payload.module_id,
        course_id=payload.course_id,
        is_completed=True,
        completed_at=datetime.now(timezone.utc)
    )
    db.add(progress)
    db.commit()
    db.refresh(progress)
    return progress


# ── MARK MODULE AS INCOMPLETE ──────────────────────────────────────────────
@router.post("/incomplete")
def mark_module_incomplete(payload: MarkModuleComplete, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]

    existing = db.query(UserProgress).filter(
        UserProgress.user_id == user_id,
        UserProgress.module_id == payload.module_id,
        UserProgress.course_id == payload.course_id
    ).first()

    if existing:
        existing.is_completed = False
        existing.completed_at = None
        db.commit()

    return {"message": "Module marked incomplete"}


# ── UPDATE GRANULAR PROGRESS ───────────────────────────────────────────────
@router.patch("/update", response_model=ProgressOut)
def update_progress(payload: ModuleProgressUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]

    existing = db.query(UserProgress).filter(
        UserProgress.user_id == user_id,
        UserProgress.module_id == payload.module_id,
        UserProgress.course_id == payload.course_id
    ).first()

    if not existing:
        existing = UserProgress(
            user_id=user_id,
            module_id=payload.module_id,
            course_id=payload.course_id
        )
        db.add(existing)

    if payload.video_watched is not None:
        existing.video_watched = payload.video_watched
    if payload.notes_viewed is not None:
        existing.notes_viewed = payload.notes_viewed
    if payload.assignment_submitted is not None:
        existing.assignment_submitted = payload.assignment_submitted
    if payload.quiz_completed is not None:
        existing.quiz_completed = payload.quiz_completed
    if payload.last_video_timestamp is not None:
        existing.last_video_timestamp = payload.last_video_timestamp
    if payload.last_tab is not None:
        existing.last_tab = payload.last_tab

    # Auto-calculate is_completed
    if existing.video_watched and existing.notes_viewed and existing.quiz_completed:
        existing.is_completed = True
        if not existing.completed_at:
            existing.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(existing)
    return existing


@router.post("/video")
def update_video_progress(payload: VideoProgressUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    
    video = db.query(Video).filter(Video.id == payload.video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    existing = db.query(UserVideoProgress).filter(
        UserVideoProgress.user_id == user_id,
        UserVideoProgress.video_id == payload.video_id
    ).first()

    if not existing:
        existing = UserVideoProgress(
            user_id=user_id,
            video_id=payload.video_id
        )
        db.add(existing)

    existing.watched_seconds = payload.watched_seconds
    
    # 90% Rule for completion
    if video.duration_seconds > 0:
        if payload.watched_seconds >= (video.duration_seconds * 0.9):
            existing.is_completed = True
    else:
        # If duration is 0, mark completed if any progress is made (fallback)
        if payload.watched_seconds > 0:
            existing.is_completed = True

    db.commit()

    # Sync with Module Progress (UserProgress table)
    module_id = video.module_id
    all_videos = db.query(Video).filter(Video.module_id == module_id).all()
    completed_video_ids = [vp.video_id for vp in db.query(UserVideoProgress).filter(
        UserVideoProgress.user_id == user_id,
        UserVideoProgress.video_id.in_([v.id for v in all_videos]),
        UserVideoProgress.is_completed == True
    ).all()]

    if len(completed_video_ids) == len(all_videos) and len(all_videos) > 0:
        # All videos in module completed
        mod_progress = db.query(UserProgress).filter(
            UserProgress.user_id == user_id,
            UserProgress.module_id == module_id
        ).first()
        if mod_progress:
            mod_progress.video_watched = True
            db.commit()

    return {"message": "Progress updated", "is_completed": existing.is_completed}


# ── GET DETAILED PROGRESS FOR A MODULE ─────────────────────────────────────
@router.get("/module/{course_id}/{module_id}", response_model=ModuleProgressDetail)
def get_module_progress_detail(course_id: int, module_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]

    # Get module and its videos
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    videos = db.query(Video).filter(Video.module_id == module_id).all()
    video_ids = [v.id for v in videos]

    # Get video progress
    video_progress = []
    if video_ids:
        video_progress = db.query(UserVideoProgress).filter(
            UserVideoProgress.user_id == user_id,
            UserVideoProgress.video_id.in_(video_ids)
        ).all()
    video_progress_map = {vp.video_id: vp for vp in video_progress}

    video_list_out = []
    all_videos_completed = True if videos else False
    
    for v in videos:
        vp = video_progress_map.get(v.id)
        video_list_out.append(UserVideoProgressOut(
            video_id=v.id,
            watched_seconds=vp.watched_seconds if vp else 0.0,
            is_completed=vp.is_completed if vp else False,
            duration_seconds=v.duration_seconds
        ))
        if not vp or not vp.is_completed:
            all_videos_completed = False

    existing = db.query(UserProgress).filter(
        UserProgress.user_id == user_id,
        UserProgress.module_id == module_id,
        UserProgress.course_id == course_id
    ).first()

    if not existing:
        return ModuleProgressDetail(
            module_id=module_id,
            progress_percent=0,
            video_completed=False,
            notes_completed=False,
            assignment_submitted=False,
            quiz_completed=False,
            last_video_timestamp=0.0,
            last_tab="video",
            quiz_unlocked=all_videos_completed,
            videos=video_list_out
        )

    # Sync video_watched if it was calculated
    if existing.video_watched != all_videos_completed:
        existing.video_watched = all_videos_completed
        db.commit()

    # Calculate percent based on 4 pillars
    pillars = [existing.video_watched, existing.notes_viewed, existing.assignment_submitted, existing.quiz_completed]
    completed_pillars = sum(1 for p in pillars if p)
    percent = round((completed_pillars / 4) * 100)

    return ModuleProgressDetail(
        module_id=module_id,
        progress_percent=percent,
        video_completed=bool(existing.video_watched),
        notes_completed=bool(existing.notes_viewed),
        assignment_submitted=bool(existing.assignment_submitted),
        quiz_completed=bool(existing.quiz_completed),
        last_video_timestamp=float(existing.last_video_timestamp or 0.0),
        last_tab=existing.last_tab or "video",
        quiz_unlocked=all_videos_completed,
        videos=video_list_out
    )


# ── GET PROGRESS FOR A COURSE ──────────────────────────────────────────────
@router.get("/course/{course_id}", response_model=CourseProgress)
def get_course_progress(course_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]

    total = db.query(func.count(Module.id)).filter(
        Module.course_id == course_id,
        Module.is_active == True
    ).scalar()

    if total == 0:
        return CourseProgress(
            progress_percent=0,
            completed_modules=0,
            total_modules=0,
            status="not_started"
        )

    completed = db.query(func.count(UserProgress.id)).filter(
        UserProgress.user_id == user_id,
        UserProgress.course_id == course_id,
        UserProgress.is_completed == True
    ).scalar()

    percent = round((completed / total) * 100)
    status = "completed" if percent == 100 else "in_progress" if percent > 0 else "not_started"

    return CourseProgress(
        progress_percent=percent,
        completed_modules=completed,
        total_modules=total,
        status=status
    )


# ── GET ALL COMPLETED MODULES FOR A COURSE ─────────────────────────────────
@router.get("/course/{course_id}/modules")
def get_module_progress(course_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]

    records = db.query(UserProgress).filter(
        UserProgress.user_id == user_id,
        UserProgress.course_id == course_id
    ).all()

    return [
        {
            "module_id": r.module_id,
            "is_completed": r.is_completed,
            "video_watched": r.video_watched,
            "notes_viewed": r.notes_viewed,
            "assignment_submitted": r.assignment_submitted,
            "quiz_completed": r.quiz_completed,
            "completed_at": r.completed_at
        }
        for r in records
    ]

