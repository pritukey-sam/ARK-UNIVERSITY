import sys
import os
from pydantic import ValidationError

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from schemas import (
    CompanyWithAdminCreate,
    CourseCreate,
    ModuleBase,
    VideoCreate,
    QuestionCreate,
    QuizCreate,
    RegistrationApproval
)
from routes import (
    CreateUserRequest,
    UserUpdate,
    CreateCourseRequest,
    CreateModuleRequest,
    AddVideoRequest,
    CreateQuizRequest
)

def run_tests():
    print("=== STARTING BACKEND VALIDATION TESTS ===")
    errors = 0

    # 1. CompanyWithAdminCreate Tests
    print("\n1. Testing CompanyWithAdminCreate...")
    
    # Invalid Symbol-only company name
    try:
        CompanyWithAdminCreate(
            name="$$%%@#^%^",
            plan_type="free",
            plan_price=0.0,
            admin_name="John Doe",
            admin_email="john@example.com",
            admin_password="password123"
        )
        print("FAIL: Symbol-only company name was accepted")
        errors += 1
    except ValidationError as e:
        print("PASS: Symbol-only company name was rejected:", str(e).split('\n')[0])

    # Whitespace-only company name
    try:
        CompanyWithAdminCreate(
            name="   ",
            plan_type="free",
            plan_price=0.0,
            admin_name="John Doe",
            admin_email="john@example.com",
            admin_password="password123"
        )
        print("FAIL: Whitespace-only company name was accepted")
        errors += 1
    except ValidationError as e:
        print("PASS: Whitespace-only company name was rejected:", str(e).split('\n')[0])

    # Invalid Admin Name (contains numbers)
    try:
        CompanyWithAdminCreate(
            name="Acme Corp",
            plan_type="free",
            plan_price=0.0,
            admin_name="John123",
            admin_email="john@example.com",
            admin_password="password123"
        )
        print("FAIL: Admin name with numbers was accepted")
        errors += 1
    except ValidationError as e:
        print("PASS: Admin name with numbers was rejected:", str(e).split('\n')[0])

    # Invalid Admin Email
    try:
        CompanyWithAdminCreate(
            name="Acme Corp",
            plan_type="free",
            plan_price=0.0,
            admin_name="John Doe",
            admin_email="john example.com",
            admin_password="password123"
        )
        print("FAIL: Malformed admin email was accepted")
        errors += 1
    except ValidationError as e:
        print("PASS: Malformed admin email was rejected:", str(e).split('\n')[0])

    # Too short Admin Password
    try:
        CompanyWithAdminCreate(
            name="Acme Corp",
            plan_type="free",
            plan_price=0.0,
            admin_name="John Doe",
            admin_email="john@example.com",
            admin_password="short"
        )
        print("FAIL: Too short admin password was accepted")
        errors += 1
    except ValidationError as e:
        print("PASS: Too short admin password was rejected:", str(e).split('\n')[0])

    # Negative Subscription Price
    try:
        CompanyWithAdminCreate(
            name="Acme Corp",
            plan_type="paid",
            plan_price=-100.0,
            admin_name="John Doe",
            admin_email="john@example.com",
            admin_password="password123"
        )
        print("FAIL: Negative plan price was accepted")
        errors += 1
    except ValidationError as e:
        print("PASS: Negative plan price was rejected:", str(e).split('\n')[0])

    # Too high Subscription Price
    try:
        CompanyWithAdminCreate(
            name="Acme Corp",
            plan_type="paid",
            plan_price=99999999.0,
            admin_name="John Doe",
            admin_email="john@example.com",
            admin_password="password123"
        )
        print("FAIL: Too high plan price was accepted")
        errors += 1
    except ValidationError as e:
        print("PASS: Too high plan price was rejected:", str(e).split('\n')[0])

    # 2. CourseCreate / CreateCourseRequest Tests
    print("\n2. Testing CourseCreate / CreateCourseRequest...")

    # Symbol-only course title
    try:
        CreateCourseRequest(
            title="!!!@@@###"
        )
        print("FAIL: Symbol-only course title was accepted")
        errors += 1
    except ValidationError as e:
        print("PASS: Symbol-only course title was rejected:", str(e).split('\n')[0])

    # Valid Technical Course Title
    try:
        c = CreateCourseRequest(
            title="C++ & .NET Programming 101"
        )
        print("PASS: Valid technical course title was accepted:", c.title)
    except ValidationError as e:
        print("FAIL: Valid technical course title was rejected:", str(e))
        errors += 1

    # Whitespace-only description
    try:
        CreateCourseRequest(
            title="Python Advanced",
            description="     "
        )
        print("FAIL: Whitespace-only course description was accepted")
        errors += 1
    except ValidationError as e:
        print("PASS: Whitespace-only course description was rejected:", str(e).split('\n')[0])

    # Invalid Course Completion Duration
    try:
        CreateCourseRequest(
            title="Python Advanced",
            completion_duration_days=500
        )
        print("FAIL: Out of range duration days was accepted")
        errors += 1
    except ValidationError as e:
        print("PASS: Out of range duration days was rejected:", str(e).split('\n')[0])

    # 3. CreateUserRequest Tests
    print("\n3. Testing CreateUserRequest...")

    # Invalid Designation (Symbol Spam)
    try:
        CreateUserRequest(
            email="employee@company.com",
            name="Alex Smith",
            role="employee",
            designation="#####%%%%%"
        )
        print("FAIL: Symbol-spam user designation was accepted")
        errors += 1
    except ValidationError as e:
        print("PASS: Symbol-spam user designation was rejected:", str(e).split('\n')[0])

    # Valid Designation with Alphanumerics
    try:
        u = CreateUserRequest(
            email="employee@company.com",
            name="Alex Smith",
            role="employee",
            designation="SDE-2"
        )
        print("PASS: Valid alphanumeric designation was accepted:", u.designation)
    except ValidationError as e:
        print("FAIL: Valid alphanumeric designation was rejected:", str(e))
        errors += 1

    # Whitespace-only Employee ID
    try:
        CreateUserRequest(
            email="employee@company.com",
            name="Alex Smith",
            role="employee",
            employee_id="    "
        )
        print("FAIL: Whitespace-only employee ID was accepted")
        errors += 1
    except ValidationError as e:
        print("PASS: Whitespace-only employee ID was rejected:", str(e).split('\n')[0])

    # 4. VideoCreate / AddVideoRequest Tests
    print("\n4. Testing VideoCreate / AddVideoRequest...")

    # Invalid Video URL (Garbage Text)
    try:
        AddVideoRequest(
            title="Introduction to React",
            video_url="garbage-non-url-text",
            duration_seconds=120
        )
        print("FAIL: Garbage text video URL was accepted")
        errors += 1
    except ValidationError as e:
        print("PASS: Garbage text video URL was rejected:", str(e).split('\n')[0])

    # Valid Video URL (HTTPS)
    try:
        v = AddVideoRequest(
            title="Introduction to React",
            video_url="https://youtube.com/watch?v=12345",
            duration_seconds=120
        )
        print("PASS: Valid HTTPS video URL was accepted:", v.video_url)
    except ValidationError as e:
        print("FAIL: Valid HTTPS video URL was rejected:", str(e))
        errors += 1

    print("\n=== TESTS COMPLETE ===")
    if errors == 0:
        print("ALL TESTS PASSED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print(f"{errors} TESTS FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
