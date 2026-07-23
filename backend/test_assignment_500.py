import sys
import os
import traceback
from sqlalchemy.orm import Session

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User, Course, AssignmentRequest
from routers.assignments import create_assignment_request
from schemas import AssignmentRequestCreate

def run_test():
    db = SessionLocal()
    try:
        # Find an HR user
        hr = db.query(User).filter(User.role == 'hr').first()
        if not hr:
            print("No HR user found in database. Trying any user with hr role...")
            hr = db.query(User).filter(User.role.in_(['hr', 'admin'])).first()
        
        if not hr:
            print("No HR/Admin user found at all. Cannot proceed.")
            return

        print(f"Using HR user: id={hr.id}, email={hr.email}, company_id={hr.company_id}")

        # Find an employee in the same company
        employee = db.query(User).filter(User.role == 'employee', User.company_id == hr.company_id).first()
        if not employee:
            print("No employee found in same company. Creating one...")
            employee = User(
                name="Test Employee",
                email="test_emp@example.com",
                role="employee",
                company_id=hr.company_id,
                password_hash="test",
                is_active=True
            )
            db.add(employee)
            db.commit()
            db.refresh(employee)
            print(f"Created employee: id={employee.id}")
        else:
            print(f"Using employee: id={employee.id}, email={employee.email}")

        # Find a course in the same company
        course = db.query(Course).filter(Course.company_id == hr.company_id).first()
        if not course:
            print("No course found in company. Creating one...")
            course = Course(
                title="Test Course",
                description="Test Description",
                company_id=hr.company_id,
                is_active=True
            )
            db.add(course)
            db.commit()
            db.refresh(course)
            print(f"Created course: id={course.id}")
        else:
            print(f"Using course: id={course.id}, title={course.title}")

        # Now, try calling create_assignment_request
        payload = AssignmentRequestCreate(
            user_id=employee.id,
            course_id=course.id,
            hr_id=hr.id,
            requested_due_date=None,
            note="Test Note"
        )
        
        current_user = {
            "id": hr.id,
            "role": "hr",
            "company_id": hr.company_id
        }

        print("Calling create_assignment_request...")
        res = create_assignment_request(body=payload, db=db, current_user=current_user)
        print("Success! Response:")
        print(res)

    except Exception as e:
        print("EXCEPTION CAUGHT:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
