from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from database import get_db
from auth import require_roles
from models import User, Course, Enrollment, UserProgress, Submission, QuizAttempt, Quiz

router = APIRouter(tags=["Dashboard"])

@router.get("/dashboard/hr-analytics")
def get_hr_analytics(db: Session = Depends(get_db), current_user=Depends(require_roles(["hr", "admin"]))):
    company_id = current_user.get("company_id")
    from models import Module
    
    # 1. Workforce Stats
    total_employees_query = db.query(User).filter(User.role == 'employee', User.is_active == True)
    total_assignments_query = db.query(Enrollment).join(User).filter(User.is_active == True)
    active_learners_query = db.query(User.id).join(Enrollment, User.id == Enrollment.user_id).filter(
        User.is_active == True
    ).join(UserProgress, User.id == UserProgress.user_id).filter(
        (UserProgress.is_completed == True) | (UserProgress.last_video_timestamp > 0)
    ).distinct()

    if company_id:
        total_employees_query = total_employees_query.filter(User.company_id == company_id)
        total_assignments_query = total_assignments_query.filter(User.company_id == company_id)
        active_learners_query = active_learners_query.filter(User.company_id == company_id)

    total_employees = total_employees_query.count()
    total_assignments = total_assignments_query.count()
    active_learners_count = active_learners_query.count()
    
    total_completions_query = db.query(Enrollment).join(User).filter(User.is_active == True, Enrollment.is_completed == True)
    if company_id:
        total_completions_query = total_completions_query.filter(User.company_id == company_id)
    total_completions = total_completions_query.count()

    # Optimized Completion Rate
    all_enrollments_query = db.query(Enrollment).join(Course)
    if company_id:
        all_enrollments_query = all_enrollments_query.filter(Course.company_id == company_id)
    all_enrollments = all_enrollments_query.all()
    comp_count = 0
    if all_enrollments:
        # Pre-fetch module counts per course
        module_counts = dict(db.query(Module.course_id, func.count(Module.id)).group_by(Module.course_id).all())
        # Pre-fetch completed modules per user/course
        completed_counts = db.query(
            UserProgress.user_id, UserProgress.course_id, func.count(UserProgress.id)
        ).filter(UserProgress.is_completed == True).group_by(UserProgress.user_id, UserProgress.course_id).all()
        
        comp_map = {(r[0], r[1]): r[2] for r in completed_counts}
        
        for e in all_enrollments:
            total_m = module_counts.get(e.course_id, 0)
            done_m = comp_map.get((e.user_id, e.course_id), 0)
            if total_m > 0 and done_m >= total_m:
                comp_count += 1
    
    completion_rate = (comp_count / len(all_enrollments) * 100) if all_enrollments else 0

    # 2. Optimized Course Popularity
    courses_query = db.query(Course)
    if company_id:
        courses_query = courses_query.filter(Course.company_id == company_id)
    courses_raw = courses_query.all()
    popularity = []
    if courses_raw:
        # Pre-fetch module counts
        module_counts = dict(db.query(Module.course_id, func.count(Module.id)).group_by(Module.course_id).all())
        # Enrollment counts
        enroll_counts = dict(db.query(Enrollment.course_id, func.count(Enrollment.id)).group_by(Enrollment.course_id).all())
        
        for c in courses_raw:
            total_m = module_counts.get(c.id, 0)
            assigned = enroll_counts.get(c.id, 0)
            completed = 0
            if total_m > 0:
                # Count users who completed all modules for this course
                course_enrollments = db.query(Enrollment.user_id).filter(Enrollment.course_id == c.id).all()
                for (u_id,) in course_enrollments:
                    if comp_map.get((u_id, c.id), 0) >= total_m:
                        completed += 1
            popularity.append({"title": c.title, "assigned_count": assigned, "completed_count": completed})

    # 3. Optimized Employee Performance
    employee_stats_query = db.query(User).filter(User.role == 'employee', User.is_active == True)
    if company_id:
        employee_stats_query = employee_stats_query.filter(User.company_id == company_id)
    employee_stats_raw = employee_stats_query.all()
    employee_stats = []
    
    for u in employee_stats_raw:
        u_enrollments = db.query(Enrollment.course_id).filter(Enrollment.user_id == u.id).all()
        u_total_assigned = len(u_enrollments)
        u_completed = 0
        total_prog = 0
        for (c_id,) in u_enrollments:
            total_m = module_counts.get(c_id, 0)
            done_m = comp_map.get((u.id, c_id), 0)
            if total_m > 0:
                prog = (done_m / total_m) * 100
                total_prog += prog
                if done_m >= total_m: u_completed += 1
        
        avg_prog = (total_prog / u_total_assigned) if u_total_assigned > 0 else 0
        
        status = "Active"
        is_inactive = False
        if u.last_login_at:
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            last_login = u.last_login_at
            if last_login.tzinfo is None:
                last_login = last_login.replace(tzinfo=timezone.utc)
            if (now - last_login).days > 7:
                is_inactive = True
        
        if is_inactive: status = "Inactive"
        elif u_total_assigned > 0 and avg_prog < 20: status = "At Risk"
        elif u_total_assigned == 0: status = "Inactive"
            
        employee_stats.append({
            "id": u.id, "name": u.name, "email": u.email,
            "total_assigned": u_total_assigned, "completed": u_completed,
            "avg_progress": round(avg_prog, 1), "status": status,
            "last_login": u.last_login_at.isoformat() if u.last_login_at else None
        })

    return {
        "stats": {
            "totalEmployees": total_employees,
            "totalAssignments": total_assignments,
            "activeLearners": active_learners_count,
            "completionRate": round(completion_rate, 1),
            "totalCompletions": total_completions
        },
        "coursePopularity": popularity,
        "employeeStats": employee_stats
    }

@router.get("/dashboard/employee-analytics")
def get_employee_analytics(db: Session = Depends(get_db), current_user=Depends(require_roles(["employee", "admin"]))):
    user_id = current_user["id"]
    
    # 1. Quiz History
    quiz_history = db.query(
        Quiz.title,
        QuizAttempt.score,
        QuizAttempt.attempted_at
    ).join(Quiz, QuizAttempt.quiz_id == Quiz.id
    ).filter(QuizAttempt.user_id == user_id
    ).order_by(QuizAttempt.attempted_at.desc()).limit(10).all()

    # 2. Average Score
    avg_score = db.query(func.avg(QuizAttempt.score)).filter(QuizAttempt.user_id == user_id).scalar()
    
    return {
        "quizHistory": [{"title": r.title, "score": r.score, "attempted_at": r.attempted_at} for r in quiz_history],
        "avgScore": round(float(avg_score or 0), 1)
    }

@router.get("/dashboard/analytics")
def get_dashboard_analytics(db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    try:
        from sqlalchemy import text
        company_id = current_user.get("company_id")
        
        # User growth (last 6 months)
        user_growth_query = db.query(
            func.to_char(User.created_at, 'YYYY-MM').label('month'),
            func.count(User.id).label('count')
        ).filter(
            User.is_active == True,
            User.created_at >= func.now() - text("interval '6 months'")
        )
        if company_id:
            user_growth_query = user_growth_query.filter(User.company_id == company_id)
            
        user_growth = user_growth_query.group_by('month').order_by('month').all()

        # Completion speed/rate per course
        completion_rate_query = db.query(
            Course.title,
            func.count(Enrollment.id).label('total'),
            func.sum(case((UserProgress.is_completed == True, 1), else_=0)).label('completed')
        ).join(Enrollment, Course.id == Enrollment.course_id, isouter=True
        ).join(UserProgress, Course.id == UserProgress.course_id, isouter=True)
        
        if company_id:
            completion_rate_query = completion_rate_query.filter(Course.company_id == company_id)
            
        completion_rate_raw = completion_rate_query.group_by(Course.id, Course.title).all()

        role_dist_query = db.query(
            User.role,
            func.count(User.id).label('count')
        ).filter(User.is_active == True)
        
        if company_id:
            role_dist_query = role_dist_query.filter(User.company_id == company_id)
            
        role_dist = role_dist_query.group_by(User.role).all()

        quiz_scores_query = db.query(
            case(
                (QuizAttempt.score >= 90, 'Excellent'),
                (QuizAttempt.score >= 70, 'Good'),
                (QuizAttempt.score >= 50, 'Average'),
                else_='Below Avg'
            ).label('range'),
            func.count(QuizAttempt.id).label('count')
        ).join(User, QuizAttempt.user_id == User.id)
        
        if company_id:
            quiz_scores_query = quiz_scores_query.filter(User.company_id == company_id)
            
        quiz_scores = quiz_scores_query.group_by('range').all()

        # Assignment status counts
        assignment_status_query = db.query(Enrollment).join(Course)
        if company_id:
            assignment_status_query = assignment_status_query.filter(Course.company_id == company_id)
        
        # Protect against empty results and nulls
        return {
            "userGrowth": [{"month": r.month or "Unknown", "count": r.count or 0} for r in user_growth] if user_growth else [],
            "completionRate": [{"title": r.title or "Untitled", "total": r.total or 0, "completed": r.completed or 0} for r in completion_rate_raw] if completion_rate_raw else [],
            "assignmentStatus": [{"status": "enrolled", "count": assignment_status_query.count() or 0}],
            "roleDistribution": [{"role": r.role or "Unknown", "count": r.count or 0} for r in role_dist] if role_dist else [],
            "quizScores": [{"range": r.range or "N/A", "count": r.count or 0} for r in quiz_scores] if quiz_scores else [],
        }
    except Exception as e:
        print(f"Dashboard Analytics Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to load dashboard analytics due to a calculation error.")

