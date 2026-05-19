from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from auth import get_current_user
from models import UserProgress, UserVideoProgress, Video, Module, Notes, Assignment, Quiz, QuizAttempt, Enrollment, ActivityLog
from schemas import VideoProgressUpdate, NotesProgressUpdate, ModuleProgressDetail, UserVideoProgressOut, CourseProgress
from fastapi.responses import JSONResponse
from datetime import datetime, timezone

router = APIRouter(prefix="/progress", tags=["Progress"])

# ── VIDEO PROGRESS UPDATE ──────────────────────────────────────────────────
@router.post("/video")
async def update_video_progress(payload: VideoProgressUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    try:
        video_id = payload.video_id
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            return JSONResponse(status_code=404, content={"detail": "Video not found"})

        module_id = video.module_id
        
        # Get or create video progress
        existing = db.query(UserVideoProgress).filter(
            UserVideoProgress.user_id == user_id,
            UserVideoProgress.video_id == video_id
        ).first()

        if not existing:
            existing = UserVideoProgress(
                user_id=user_id,
                video_id=video_id,
                watched_seconds=payload.watched_seconds or 0.0,
                is_completed=payload.completed or False
            )
            db.add(existing)
        else:
            existing.watched_seconds = max(float(existing.watched_seconds or 0.0), float(payload.watched_seconds or 0.0))
            if payload.completed:
                existing.is_completed = True
        
        # 80% Rule fallback if not explicitly completed
        video_duration = float(video.duration_seconds or 0)
        if not existing.is_completed and video_duration > 0:
            if float(existing.watched_seconds or 0) >= (video_duration * 0.8):
                existing.is_completed = True
        
        db.commit()

        # Sync with Aggregate Module Progress
        all_videos = db.query(Video).filter(Video.module_id == module_id).all()
        video_ids = [v.id for v in all_videos]
        
        if not video_ids:
            all_vids_done = True
        else:
            completed_count = db.query(UserVideoProgress).filter(
                UserVideoProgress.user_id == user_id,
                UserVideoProgress.video_id.in_(video_ids),
                UserVideoProgress.is_completed == True
            ).count()
            all_vids_done = (completed_count == len(all_videos))

        # Update UserProgress record
        mod_prog = db.query(UserProgress).filter(
            UserProgress.user_id == user_id,
            UserProgress.module_id == module_id
        ).first()

        if not mod_prog:
            mod = db.query(Module).filter(Module.id == module_id).first()
            if mod:
                mod_prog = UserProgress(
                    user_id=user_id,
                    module_id=module_id,
                    course_id=mod.course_id,
                    video_watched=all_vids_done
                )
                db.add(mod_prog)
        else:
            mod_prog.video_watched = all_vids_done
        
        db.commit()

        # ── SYNC WITH MODULE COMPLETION ─────────────────────────────────────
        if all_vids_done:
            # Check for all pillars
            has_notes = db.query(Notes).filter(Notes.module_id == module_id).first() is not None
            has_assignment = db.query(Assignment).filter(Assignment.module_id == module_id).first() is not None
            has_quiz = db.query(Quiz).filter(Quiz.module_id == module_id).first() is not None
            
            p1 = True # Videos just finished
            p2 = bool(mod_prog.notes_viewed) if has_notes else True
            p3 = bool(mod_prog.assignment_submitted) if has_assignment else True
            p4 = bool(mod_prog.quiz_completed) if has_quiz else True
            
            if p1 and p2 and p3 and p4 and not mod_prog.is_completed:
                mod_prog.is_completed = True
                mod_prog.completed_at = datetime.now(timezone.utc)
                db.add(ActivityLog(
                    company_id=current_user.get("company_id"),
                    user_id=user_id,
                    action="Module Completed",
                    details=f"Successfully finished all requirements for module ID: {module_id}"
                ))
                db.commit()

            # ── SYNC WITH COURSE ENROLLMENT ───────────────────────────────────
            if mod_prog.is_completed:
                total_modules = db.query(Module).filter(Module.course_id == mod_prog.course_id, Module.is_active == True).count()
                completed_modules = db.query(UserProgress).filter(
                    UserProgress.user_id == user_id,
                    UserProgress.course_id == mod_prog.course_id,
                    UserProgress.is_completed == True
                ).count()
                
                if total_modules > 0 and completed_modules >= total_modules:
                    enrollment = db.query(Enrollment).filter(
                        Enrollment.user_id == user_id,
                        Enrollment.course_id == mod_prog.course_id
                    ).first()
                    if enrollment and not enrollment.is_completed:
                        enrollment.is_completed = True
                        enrollment.completed_at = datetime.now(timezone.utc)
                        db.add(ActivityLog(
                            company_id=current_user.get("company_id"),
                            user_id=user_id,
                            action="Course Completed",
                            details=f"Finished all modules in course ID: {mod_prog.course_id}"
                        ))
                        db.commit()

            # Log Activity for video completion
            db.add(ActivityLog(
                company_id=current_user.get("company_id"),
                user_id=user_id,
                action="Video Completed",
                details=f"Watched all videos in module ID: {module_id}"
            ))
            db.commit()

        return {"success": True, "completed": bool(existing.is_completed)}

    except Exception as e:
        db.rollback()
        print(f"DATABASE ERROR in update_video_progress: {str(e)}")
        return JSONResponse(status_code=500, content={"detail": f"Internal Server Error: {str(e)}"})


@router.post("/notes")
async def update_notes_progress(payload: NotesProgressUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    try:
        module_id = payload.module_id
        # Get module to find course_id
        mod = db.query(Module).filter(Module.id == module_id).first()
        if not mod:
            return JSONResponse(status_code=404, content={"detail": "Module not found"})

        existing = db.query(UserProgress).filter(
            UserProgress.user_id == user_id,
            UserProgress.module_id == module_id
        ).first()

        if not existing:
            existing = UserProgress(
                user_id=user_id,
                module_id=module_id,
                course_id=mod.course_id,
                notes_viewed=bool(payload.completed)
            )
            db.add(existing)
        else:
            existing.notes_viewed = bool(payload.completed)
        
        db.commit()

        # ── SYNC WITH MODULE COMPLETION ─────────────────────────────────────
        if bool(payload.completed):
            # Check for all pillars
            has_assignment = db.query(Assignment).filter(Assignment.module_id == module_id).first() is not None
            has_quiz = db.query(Quiz).filter(Quiz.module_id == module_id).first() is not None
            
            p1 = bool(existing.video_watched)
            p2 = True # Notes just viewed
            p3 = bool(existing.assignment_submitted) if has_assignment else True
            p4 = bool(existing.quiz_completed) if has_quiz else True
            
            if p1 and p2 and p3 and p4 and not existing.is_completed:
                existing.is_completed = True
                existing.completed_at = datetime.now(timezone.utc)
                db.add(ActivityLog(
                    company_id=current_user.get("company_id"),
                    user_id=user_id,
                    action="Module Completed",
                    details=f"Successfully finished all requirements for module ID: {module_id}"
                ))
                db.commit()

            # ── SYNC WITH COURSE ENROLLMENT ───────────────────────────────────
            if existing.is_completed:
                total_modules = db.query(Module).filter(Module.course_id == mod.course_id, Module.is_active == True).count()
                completed_modules = db.query(UserProgress).filter(
                    UserProgress.user_id == user_id,
                    UserProgress.course_id == mod.course_id,
                    UserProgress.is_completed == True
                ).count()
                
                if total_modules > 0 and completed_modules >= total_modules:
                    enrollment = db.query(Enrollment).filter(
                        Enrollment.user_id == user_id,
                        Enrollment.course_id == mod.course_id
                    ).first()
                    if enrollment and not enrollment.is_completed:
                        enrollment.is_completed = True
                        enrollment.completed_at = datetime.now(timezone.utc)
                        db.add(ActivityLog(
                            company_id=current_user.get("company_id"),
                            user_id=user_id,
                            action="Course Completed",
                            details=f"Finished all modules in course ID: {mod.course_id}"
                        ))
                        db.commit()

            # Log Activity for notes
            db.add(ActivityLog(
                company_id=current_user.get("company_id"),
                user_id=user_id,
                action="Notes Viewed",
                details=f"Completed reading material for module ID: {module_id}"
            ))
            db.commit()

        return {"success": True, "completed": bool(existing.notes_viewed)}
    except Exception as e:
        db.rollback()
        print(f"DATABASE ERROR in update_notes_progress: {str(e)}")
        return JSONResponse(status_code=500, content={"detail": f"Internal Server Error: {str(e)}"})

# ── GET DETAILED PROGRESS FOR A MODULE ─────────────────────────────────────
@router.get("/module/{course_id}/{module_id}", response_model=ModuleProgressDetail)
def get_module_progress_detail(course_id: int, module_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        user_id = current_user["id"]

        # Get module and its videos
        module = db.query(Module).filter(Module.id == module_id).first()
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        
        videos = db.query(Video).filter(Video.module_id == module_id).all()
        video_ids = [v.id for v in videos]

        # Get video progress
        video_progress_map = {}
        if video_ids:
            video_progress = db.query(UserVideoProgress).filter(
                UserVideoProgress.user_id == user_id,
                UserVideoProgress.video_id.in_(video_ids)
            ).all()
            video_progress_map = {vp.video_id: vp for vp in video_progress}

        video_list_out = []
        all_videos_completed = True 
        
        for v in videos:
            vp = video_progress_map.get(v.id)
            is_done = bool(vp.is_completed) if vp else False
            video_list_out.append(UserVideoProgressOut(
                video_id=v.id,
                watched_seconds=float(vp.watched_seconds or 0.0) if vp else 0.0,
                is_completed=is_done,
                duration_seconds=int(v.duration_seconds or 0)
            ))
            if not is_done:
                all_videos_completed = False

        # Ensure module progress record exists (Idempotent creation)
        existing = db.query(UserProgress).filter(
            UserProgress.user_id == user_id,
            UserProgress.module_id == module_id
        ).first()

        if not existing:
            existing = UserProgress(
                user_id=user_id,
                module_id=module_id,
                course_id=course_id,
                video_watched=all_videos_completed,
                notes_viewed=False,
                assignment_submitted=False,
                quiz_completed=False
            )
            db.add(existing)
            db.commit()
            db.refresh(existing)
        else:
            # Update course_id if missing or wrong, and sync video status
            if existing.course_id != course_id:
                existing.course_id = course_id
            if existing.video_watched != all_videos_completed:
                existing.video_watched = all_videos_completed
            db.commit()

        # Check for other pillars
        has_notes = db.query(Notes).filter(Notes.module_id == module_id).first() is not None
        has_assignment = db.query(Assignment).filter(Assignment.module_id == module_id).first() is not None
        
        notes_done = True
        if has_notes:
            notes_done = bool(existing.notes_viewed)
            
        assignment_done = True
        if has_assignment:
            assignment_done = bool(existing.assignment_submitted)

        # Quiz completion status
        quiz_done = bool(existing.quiz_completed)

        # Unlock assessment ONLY if Video + Notes + Assignments are done
        quiz_unlocked = all_videos_completed and notes_done and assignment_done
        
        # Pillar-based completion percentage (4 pillars: Video, Notes, Assignment, Quiz)
        p1 = all_videos_completed
        p2 = notes_done
        p3 = assignment_done
        p4 = quiz_done
        
        completed_pillars = sum([1 for p in [p1, p2, p3, p4] if p])
        percent = int((completed_pillars / 4) * 100)

        # Final check: if everything is done, mark module as completed
        if p1 and p2 and p3 and p4 and not existing.is_completed:
            existing.is_completed = True
            existing.completed_at = datetime.now(timezone.utc)
            db.commit()

        return ModuleProgressDetail(
            module_id=module_id,
            overall_progress=percent,
            video_completed=p1,
            notes_completed=p2,
            assignment_completed=p3,
            quiz_completed=p4,
            last_video_timestamp=float(existing.last_video_timestamp or 0.0),
            last_tab=str(existing.last_tab or "video"),
            quiz_unlocked=quiz_unlocked,
            videos=video_list_out
        )
    except Exception as e:
        print(f"ERROR in get_module_progress_detail: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# ── GET PROGRESS FOR A COURSE ──────────────────────────────────────────────
@router.get("/course/{course_id}", response_model=CourseProgress)
def get_course_progress(course_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    try:
        total = db.query(func.count(Module.id)).filter(
            Module.course_id == course_id,
            Module.is_active == True
        ).scalar() or 0

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
        ).scalar() or 0

        percent = round((completed / total) * 100)
        status = "completed" if percent == 100 else "in_progress" if percent > 0 else "not_started"

        return CourseProgress(
            progress_percent=percent,
            completed_modules=completed,
            total_modules=total,
            status=status
        )
    except Exception as e:
        return CourseProgress(progress_percent=0, completed_modules=0, total_modules=0, status="not_started")


# ── GET ALL COMPLETED MODULES FOR A COURSE ─────────────────────────────────
@router.get("/course/{course_id}/modules")
def get_module_progress(course_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    try:
        records = db.query(UserProgress).filter(
            UserProgress.user_id == user_id,
            UserProgress.course_id == course_id
        ).all()

        return [
            {
                "module_id": r.module_id,
                "is_completed": bool(r.is_completed),
                "video_watched": bool(r.video_watched),
                "notes_viewed": bool(r.notes_viewed),
                "assignment_submitted": bool(r.assignment_submitted),
                "quiz_completed": bool(r.quiz_completed),
                "completed_at": r.completed_at
            }
            for r in records
        ]
    except Exception:
        return []