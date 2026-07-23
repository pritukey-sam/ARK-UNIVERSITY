import sys
import os
from sqlalchemy.orm import Session

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User, Course, CourseAccessRequest, AssignmentRequest, Enrollment
from routers.assignments import get_all_requests
from schemas import AssignmentRequestCreate

def test_origin_calculation():
    db = SessionLocal()
    try:
        # Find hr user
        hr = db.query(User).filter(User.role == "hr").first()
        if not hr:
            hr = User(name="Test HR", email="testhr@example.com", role="hr", password_hash="test", is_active=True)
            db.add(hr)
            db.commit()
            db.refresh(hr)
            
        # Find employee
        employee = db.query(User).filter(User.role == "employee").first()
        if not employee:
            employee = User(name="Test Employee", email="testemployee@example.com", role="employee", company_id=hr.company_id, password_hash="test", is_active=True)
            db.add(employee)
            db.commit()
            db.refresh(employee)

        # Find course
        course = db.query(Course).filter(Course.company_id == employee.company_id).first()
        if not course:
            course = Course(title="Origin Test Course", description="Test Course", company_id=employee.company_id, is_active=True)
            db.add(course)
            db.commit()
            db.refresh(course)

        # Clean up any existing requests
        db.query(AssignmentRequest).filter(
            AssignmentRequest.user_id == employee.id,
            AssignmentRequest.course_id == course.id
        ).delete()
        db.query(CourseAccessRequest).filter(
            CourseAccessRequest.user_id == employee.id,
            CourseAccessRequest.course_id == course.id
        ).delete()
        db.commit()

        # 1. Create a pure HR Assignment request
        print("1. Creating HR Assignment Request...")
        req = AssignmentRequest(
            hr_id=hr.id,
            user_id=employee.id,
            course_id=course.id,
            status="pending"
        )
        db.add(req)
        db.commit()

        # Query all requests
        admin_user = {"id": 1, "role": "admin", "company_id": hr.company_id}
        res_all = get_all_requests(db=db, current_user=admin_user)
        
        # Find our request
        matching = [r for r in res_all if r.user_id == employee.id and r.course_id == course.id]
        assert len(matching) > 0, "HR assignment request was not returned"
        assert matching[0].request_type == "HR Assignment", f"Expected 'HR Assignment', got {matching[0].request_type}"
        assert hr.name in matching[0].requested_by, f"Expected hr name, got {matching[0].requested_by}"
        print(f"SUCCESS: HR Assignment fields calculated: Request Type={matching[0].request_type}, Requested By={matching[0].requested_by}")

        # Clean up
        db.query(AssignmentRequest).filter(AssignmentRequest.id == req.id).delete()
        db.commit()

        # 2. Create Employee Access Request and Assignment Request (simulating approved access request assigned by admin)
        print("\n2. Creating Employee Course Access Request + Fulfillment Assignment...")
        access_req = CourseAccessRequest(
            user_id=employee.id,
            course_id=course.id,
            status="fulfilled"
        )
        db.add(access_req)
        
        req2 = AssignmentRequest(
            hr_id=1,  # Admin id
            user_id=employee.id,
            course_id=course.id,
            status="approved"
        )
        db.add(req2)
        db.commit()

        # Query all requests again
        res_all2 = get_all_requests(db=db, current_user=admin_user)
        matching2 = [r for r in res_all2 if r.user_id == employee.id and r.course_id == course.id]
        
        assert len(matching2) > 0
        assert matching2[0].request_type == "Employee Course Access Request", f"Expected 'Employee Course Access Request', got {matching2[0].request_type}"
        assert matching2[0].requested_by == "Employee Self Request", f"Expected 'Employee Self Request', got {matching2[0].requested_by}"
        print(f"SUCCESS: Employee Access Request fields calculated: Request Type={matching2[0].request_type}, Requested By={matching2[0].requested_by}")

        # Clean up
        db.delete(access_req)
        db.delete(req2)
        db.commit()

        print("\n--- ALL ORIGIN TESTS PASSED ---")

    except Exception as e:
        print("TEST FAILED:")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    test_origin_calculation()
