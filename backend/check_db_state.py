import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User, Course, AssignmentRequest, Enrollment

def run_test():
    db = SessionLocal()
    try:
        print("=== HR USERS ===")
        hrs = db.query(User).filter(User.role == 'hr').all()
        for hr in hrs:
            print(f"ID: {hr.id} | Name: {hr.name} | Email: {hr.email} | Company ID: {hr.company_id} | Is Active: {hr.is_active}")

        print("\n=== ADMIN USERS ===")
        admins = db.query(User).filter(User.role == 'admin').all()
        for admin in admins:
            print(f"ID: {admin.id} | Name: {admin.name} | Email: {admin.email} | Company ID: {admin.company_id} | Is Active: {admin.is_active}")

        print("\n=== COURSES ===")
        courses = db.query(Course).all()
        for course in courses:
            print(f"ID: {course.id} | Title: {course.title} | Company ID: {course.company_id} | Is Active: {course.is_active}")

        print("\n=== ASSIGNMENT REQUESTS ===")
        reqs = db.query(AssignmentRequest).all()
        for req in reqs:
            print(f"ID: {req.id} | HR ID: {req.hr_id} | User ID: {req.user_id} | Course ID: {req.course_id} | Status: {req.status}")

    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
