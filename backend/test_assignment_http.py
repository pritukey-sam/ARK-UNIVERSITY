import sys
import os
import requests

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User, Course, AssignmentRequest, Enrollment
from auth import generate_token

def run_test():
    db = SessionLocal()
    try:
        # Find HR user
        hr = db.query(User).filter(User.role == 'hr').first()
        if not hr:
            print("No HR user found.")
            return

        # Ensure first login is bypassed
        original_first_login = hr.is_first_login
        hr.is_first_login = False
        db.commit()
        print(f"Set is_first_login to False for HR user (id={hr.id})")

        # Find employee
        employee = db.query(User).filter(User.role == 'employee', User.company_id == hr.company_id).first()
        if not employee:
            print("No employee found.")
            return

        # Find course
        course = db.query(Course).filter(Course.company_id == hr.company_id).first()
        if not course:
            print("No course found.")
            return

        # Cleanup existing requests and enrollments so we test the full creation path
        db.query(AssignmentRequest).filter(
            AssignmentRequest.user_id == employee.id,
            AssignmentRequest.course_id == course.id
        ).delete()
        db.query(Enrollment).filter(
            Enrollment.user_id == employee.id,
            Enrollment.course_id == course.id
        ).delete()
        db.commit()
        print(f"Cleaned up existing assignments and enrollments for user={employee.id}, course={course.id}")

        # Generate JWT token
        token = generate_token(user_id=hr.id, email=hr.email, role=hr.role, company_id=hr.company_id)
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Payload
        payload = {
            "user_id": employee.id,
            "course_id": course.id,
            "hr_id": hr.id,
            "requested_due_date": None,
            "note": "HTTP Test Note"
        }

        print(f"Sending POST request to http://localhost:8002/api/assignments/request with payload: {payload}")
        url = "http://localhost:8002/api/assignments/request"
        res = requests.post(url, json=payload, headers=headers)
        print(f"Response Status: {res.status_code}")
        print(f"Response Body: {res.text}")

        # Restore original value
        hr.is_first_login = original_first_login
        db.commit()

    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
