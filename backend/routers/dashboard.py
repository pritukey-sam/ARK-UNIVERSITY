from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, text
from database import get_db
from auth import require_roles
from models import User, Course, Enrollment, UserProgress, Submission, QuizAttempt, Quiz, Module
from datetime import datetime, timezone

router = APIRouter(tags=["Dashboard"])

@router.get("/dashboard/hr-analytics")
def get_hr_analytics(db: Session = Depends(get_db), current_user=Depends(require_roles(["hr", "admin"]))):
    try:
        company_id = current_user.get("company_id")
        
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

        # Popularity
        courses_query = db.query(Course)
        if company_id:
            courses_query = courses_query.filter(Course.company_id == company_id)
        courses_raw = courses_query.all()
        popularity = []
        if courses_raw:
            enroll_counts = dict(db.query(Enrollment.course_id, func.count(Enrollment.id)).group_by(Enrollment.course_id).all())
            for c in courses_raw:
                assigned = enroll_counts.get(c.id, 0)
                popularity.append({"title": c.title, "assigned_count": assigned, "completed_count": 0})

        return {
            "stats": {
                "totalEmployees": total_employees,
                "totalAssignments": total_assignments,
                "activeLearners": active_learners_count,
                "completionRate": round(completion_rate, 1),
                "totalCompletions": total_completions
            },
            "coursePopularity": popularity,
            "employeeStats": []
        }
    except Exception as e:
        print(f"HR Analytics Error: {e}")
        return {"stats": {"totalEmployees": 0, "totalAssignments": 0, "activeLearners": 0, "completionRate": 0, "totalCompletions": 0}, "coursePopularity": [], "employeeStats": []}

@router.get("/dashboard/employee-analytics")
def get_employee_analytics(db: Session = Depends(get_db), current_user=Depends(require_roles(["employee", "admin"]))):
    try:
        user_id = current_user["id"]
        quiz_history = db.query(
            Quiz.title,
            QuizAttempt.score,
            QuizAttempt.attempted_at
        ).join(Quiz, QuizAttempt.quiz_id == Quiz.id
        ).filter(QuizAttempt.user_id == user_id
        ).order_by(QuizAttempt.attempted_at.desc()).limit(10).all()

        avg_score = db.query(func.avg(QuizAttempt.score)).filter(QuizAttempt.user_id == user_id).scalar()
        
        return {
            "quizHistory": [{"title": r.title or "Quiz", "score": float(r.score or 0), "attempted_at": r.attempted_at} for r in quiz_history],
            "avgScore": round(float(avg_score or 0), 1)
        }
    except Exception as e:
        print(f"Employee Analytics Error: {e}")
        return {"quizHistory": [], "avgScore": 0}

@router.get("/dashboard/analytics")
def get_dashboard_analytics(db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    try:
        company_id = current_user.get("company_id")
        from sqlalchemy import extract
        import calendar
        
        # 1. User Growth
        user_growth_query = db.query(
            extract('month', User.created_at).label('month_num'),
            extract('year', User.created_at).label('year'),
            func.count(User.id).label('count')
        ).filter(User.is_active == True)
        
        if company_id:
            user_growth_query = user_growth_query.filter(User.company_id == company_id)
            
        user_growth_raw = user_growth_query.group_by('year', 'month_num').order_by('year', 'month_num').all()
        
        growth_data = []
        for r in user_growth_raw:
            try:
                m_num = int(r.month_num)
                y_num = int(r.year)
                month_name = calendar.month_name[m_num]
                growth_data.append({
                    "month": f"{month_name} {y_num}",
                    "count": r.count
                })
            except:
                continue

        if not growth_data:
            growth_data = [{"month": datetime.now().strftime("%B %Y"), "count": 0}]

        # 2. Real Completion Rates per Course
        completion_rate_raw = db.query(
            Course.title,
            func.count(Enrollment.id).label('total'),
            func.sum(case((Enrollment.is_completed == True, 1), else_=0)).label('completed')
        ).join(Enrollment, Course.id == Enrollment.course_id, isouter=True)
        
        if company_id:
            completion_rate_raw = completion_rate_raw.filter(Course.company_id == company_id)
            
        completion_rate_raw = completion_rate_raw.group_by(Course.id, Course.title).all()

        # 3. Assignment Status Breakdown
        now = datetime.now(timezone.utc)
        assignment_status_query = db.query(
            case(
                (Enrollment.is_completed == True, 'completed'),
                ((Enrollment.due_date < now), 'overdue'),
                else_='in_progress'
            ).label('status'),
            func.count(Enrollment.id).label('count')
        ).join(User, Enrollment.user_id == User.id)
        
        if company_id:
            assignment_status_query = assignment_status_query.filter(User.company_id == company_id)
            
        assignment_status_raw = assignment_status_query.group_by('status').all()

        # 4. Role Distribution
        role_dist = db.query(
            User.role,
            func.count(User.id).label('count')
        ).filter(User.is_active == True)
        
        if company_id:
            role_dist = role_dist.filter(User.company_id == company_id)
        role_dist = role_dist.group_by(User.role).all()

        # 5. Top Quiz Performers
        top_quizzes = db.query(
            Quiz.title,
            func.avg(QuizAttempt.score).label('avg_score')
        ).join(QuizAttempt, Quiz.id == QuizAttempt.quiz_id
        ).join(User, QuizAttempt.user_id == User.id)
        
        if company_id:
            top_quizzes = top_quizzes.filter(User.company_id == company_id)
            
        top_quizzes = top_quizzes.group_by(Quiz.id, Quiz.title).order_by(text('avg_score DESC')).limit(5).all()

        return {
            "userGrowth": growth_data,
            "completionRate": [
                {
                    "title": r.title or "Untitled", 
                    "total": int(r.total or 0), 
                    "completed": int(r.completed or 0)
                } for r in completion_rate_raw
            ],
            "assignmentStatus": [
                {"status": r.status, "count": int(r.count or 0)} for r in assignment_status_raw
            ],
            "roleDistribution": [
                {"role": r.role or "Unknown", "count": int(r.count or 0)} for r in role_dist
            ],
            "quizScores": [
                {"title": r.title, "score": float(r.avg_score or 0)} for r in top_quizzes
            ],
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Admin Analytics Error: {e}")
        return {"userGrowth": [], "completionRate": [], "assignmentStatus": [], "roleDistribution": [], "quizScores": []}
