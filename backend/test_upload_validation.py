import sys
import os
import io
import zipfile
import json
import time

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import User, Company, Course, Module, AuditLog, Assignment, Submission, Video, Notes, UserProgress, Enrollment, ActivityLog
from auth import hash_password, generate_token
import validation

def run_tests():
    print("=== STARTING FILE UPLOAD VALIDATION TESTS ===")
    
    db = SessionLocal()
    client = TestClient(app)
    
    def cleanup_db(company_name):
        # Rollback any active transactions that might have failed to clean session state
        db.rollback()
        try:
            company_obj = db.query(Company).filter(Company.name == company_name).first()
            if company_obj:
                # 1. Delete User Progress
                db.query(UserProgress).filter(UserProgress.user_id.in_(db.query(User.id).filter(User.company_id == company_obj.id))).delete(synchronize_session=False)
                # 2. Delete Enrollments
                db.query(Enrollment).filter(Enrollment.user_id.in_(db.query(User.id).filter(User.company_id == company_obj.id))).delete(synchronize_session=False)
                # 3. Delete Submissions
                db.query(Submission).filter(Submission.user_id.in_(db.query(User.id).filter(User.company_id == company_obj.id))).delete(synchronize_session=False)
                # 4. Delete Videos
                db.query(Video).filter(Video.module_id.in_(db.query(Module.id).filter(Module.course_id.in_(db.query(Course.id).filter(Course.company_id == company_obj.id))))).delete(synchronize_session=False)
                # 5. Delete Notes
                db.query(Notes).filter(Notes.module_id.in_(db.query(Module.id).filter(Module.course_id.in_(db.query(Course.id).filter(Course.company_id == company_obj.id))))).delete(synchronize_session=False)
                # 6. Delete Assignments
                db.query(Assignment).filter(Assignment.module_id.in_(db.query(Module.id).filter(Module.course_id.in_(db.query(Course.id).filter(Course.company_id == company_obj.id))))).delete(synchronize_session=False)
                # 7. Delete Modules
                db.query(Module).filter(Module.course_id.in_(db.query(Course.id).filter(Course.company_id == company_obj.id))).delete(synchronize_session=False)
                # 8. Delete Courses
                db.query(Course).filter(Course.company_id == company_obj.id).delete(synchronize_session=False)
                # 9. Delete Activity Logs
                db.query(ActivityLog).filter(ActivityLog.company_id == company_obj.id).delete(synchronize_session=False)
                # 10. Delete Audit Logs
                db.query(AuditLog).filter(AuditLog.company_id == company_obj.id).delete(synchronize_session=False)
                # 11. Delete Users
                db.query(User).filter(User.company_id == company_obj.id).delete(synchronize_session=False)
                # 12. Delete Company
                db.query(Company).filter(Company.id == company_obj.id).delete(synchronize_session=False)
                db.commit()
        except Exception as err:
            db.rollback()
            print(f"Cleanup failed for {company_name}: {err}")

    # ── Initial Cleanup ──
    cleanup_db("Test Upload Co")

    # Set up test entities
    try:
        # Create active test company
        company = Company(
            name="Test Upload Co",
            plan_type="paid",
            status="active",
            plan_price=10.0,
            company_code="TUC",
            payment_status="completed",
            is_paid=True
        )
        db.add(company)
        db.commit()
        db.refresh(company)

        # Create Admin
        admin_user = User(
            email="test_admin@test-upload.com",
            password_hash=hash_password("password123"),
            name="Test Admin",
            role="admin",
            company_id=company.id,
            is_active=True,
            is_first_login=False
        )
        db.add(admin_user)
        
        # Create Employee
        employee_user = User(
            email="test_employee@test-upload.com",
            password_hash=hash_password("password123"),
            name="Test Employee",
            role="employee",
            company_id=company.id,
            is_active=True,
            is_first_login=False
        )
        db.add(employee_user)
        db.commit()
        db.refresh(admin_user)
        db.refresh(employee_user)

        # Generate tokens
        admin_token = generate_token(admin_user.id, admin_user.email, admin_user.role, company.id)
        employee_token = generate_token(employee_user.id, employee_user.email, employee_user.role, company.id)

        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        employee_headers = {"Authorization": f"Bearer {employee_token}"}

        # Create Course
        course = Course(
            title="Test Course",
            description="Testing secure upload validation logic",
            company_id=company.id,
            created_by=admin_user.id
        )
        db.add(course)
        db.commit()
        db.refresh(course)

        # Create Module
        module = Module(
            course_id=course.id,
            title="Test Module",
            description="LMS security module",
            order=1
        )
        db.add(module)
        db.commit()
        db.refresh(module)

        # Create Assignment/Task
        assignment = Assignment(
            module_id=module.id,
            title="Test Assignment Task",
            file_url="http://localhost:8000/uploads/assignments/dummy.pdf"
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)

        errors = 0

        # ── Test 1: Allowed PDF Notes Upload ──
        print("\n[TEST 1] Uploading allowed PDF notes...")
        pdf_content = b"%PDF-1.4\n%EOF\n"
        pdf_file = io.BytesIO(pdf_content)
        
        response = client.post(
            f"/api/modules/{module.id}/notes",
            files={"file": ("notes.pdf", pdf_file, "application/pdf")},
            headers=admin_headers
        )
        if response.status_code == 200:
            print("  PASS: Allowed PDF note upload succeeded.")
        else:
            print(f"  FAIL: Expected 200, got {response.status_code}. Response: {response.text}")
            errors += 1

        # ── Test 2: Allowed PNG Avatar Upload ──
        print("\n[TEST 2] Uploading allowed PNG avatar...")
        png_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
        png_file = io.BytesIO(png_content)
        
        response = client.post(
            "/api/account/avatar",
            files={"file": ("avatar.png", png_file, "image/png")},
            headers=employee_headers
        )
        if response.status_code == 200:
            print("  PASS: Allowed PNG avatar upload succeeded.")
        else:
            print(f"  FAIL: Expected 200, got {response.status_code}. Response: {response.text}")
            errors += 1

        # ── Test 3: Allowed MP4 Video Lecture Upload ──
        print("\n[TEST 3] Uploading allowed MP4 video...")
        mp4_content = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom"
        mp4_file = io.BytesIO(mp4_content)
        
        import routers.upload as upload_router
        original_upload_to_r2 = upload_router.upload_video_to_r2
        upload_router.upload_video_to_r2 = lambda file: "http://localhost:8000/uploads/video/mocked.mp4"

        response = client.post(
            "/api/upload-video",
            files={"video": ("lecture.mp4", mp4_file, "video/mp4")},
            headers=admin_headers
        )
        # Restore mock
        upload_router.upload_video_to_r2 = original_upload_to_r2

        if response.status_code == 200:
            print("  PASS: Allowed MP4 video upload succeeded.")
        else:
            print(f"  FAIL: Expected 200, got {response.status_code}. Response: {response.text}")
            errors += 1

        # ── Test 4: Blocked Executable (.exe) Upload ──
        print("\n[TEST 4] Uploading blocked EXE file...")
        exe_content = b"MZ\x90\x00\x03\x00\x00\x00"
        exe_file = io.BytesIO(exe_content)
        
        response = client.post(
            f"/api/modules/{module.id}/notes",
            files={"file": ("virus.exe", exe_file, "application/octet-stream")},
            headers=admin_headers
        )
        if response.status_code == 400:
            assert response.json()["detail"] == "Only PDF, DOCX, JPG, PNG and MP4 files are allowed."
            print("  PASS: Blocked EXE file was correctly rejected with HTTP 400 and exact message.")
        else:
            print(f"  FAIL: Expected 400, got {response.status_code}. Response: {response.text}")
            errors += 1

        # ── Test 5: MIME Spoofing (EXE renamed to .pdf) ──
        print("\n[TEST 5] Uploading spoofed PDF (EXE content with .pdf extension)...")
        spoofed_file = io.BytesIO(exe_content)
        
        response = client.post(
            f"/api/modules/{module.id}/notes",
            files={"file": ("virus.pdf", spoofed_file, "application/pdf")},
            headers=admin_headers
        )
        if response.status_code == 400:
            assert response.json()["detail"] == "Only PDF, DOCX, JPG, PNG and MP4 files are allowed."
            print("  PASS: Spoofed PDF containing executable bytes was rejected.")
        else:
            print(f"  FAIL: Expected 400, got {response.status_code}. Response: {response.text}")
            errors += 1

        # ── Test 6: Spoofed docx (generic ZIP renamed to .docx) ──
        print("\n[TEST 6] Uploading spoofed DOCX (generic ZIP without word/)...")
        zip_data = io.BytesIO()
        with zipfile.ZipFile(zip_data, 'w') as z:
            z.writestr("attacker_scripts.txt", "echo 1")
        zip_bytes = zip_data.getvalue()
        spoofed_docx = io.BytesIO(zip_bytes)
        
        response = client.post(
            f"/api/modules/{module.id}/notes",
            files={"file": ("test_docx.docx", spoofed_docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            headers=admin_headers
        )
        if response.status_code == 400:
            assert response.json()["detail"] == "Only PDF, DOCX, JPG, PNG and MP4 files are allowed."
            print("  PASS: Spoofed DOCX file without openxml structure was rejected.")
        else:
            print(f"  FAIL: Expected 400, got {response.status_code}. Response: {response.text}")
            errors += 1

        # ── Test 7: Double Extension (virus.exe.pdf) ──
        print("\n[TEST 7] Uploading file with double extension (virus.exe.pdf)...")
        double_ext_file = io.BytesIO(pdf_content)
        
        response = client.post(
            f"/api/modules/{module.id}/notes",
            files={"file": ("virus.exe.pdf", double_ext_file, "application/pdf")},
            headers=admin_headers
        )
        if response.status_code == 400:
            assert response.json()["detail"] == "Only PDF, DOCX, JPG, PNG and MP4 files are allowed."
            print("  PASS: Double extension virus.exe.pdf was rejected.")
        else:
            print(f"  FAIL: Expected 400, got {response.status_code}. Response: {response.text}")
            errors += 1

        # ── Test 8: TXT containing NULL bytes ──
        print("\n[TEST 8] Uploading text file containing NULL bytes...")
        null_txt_content = b"hello\x00world\x00this is binary"
        null_txt_file = io.BytesIO(null_txt_content)
        
        response = client.post(
            f"/api/modules/{module.id}/notes",
            files={"file": ("document.txt", null_txt_file, "text/plain")},
            headers=admin_headers
        )
        if response.status_code == 400:
            assert response.json()["detail"] == "Only PDF, DOCX, JPG, PNG and MP4 files are allowed."
            print("  PASS: Text file with NULL bytes was rejected.")
        else:
            print(f"  FAIL: Expected 400, got {response.status_code}. Response: {response.text}")
            errors += 1

        # ── Test 9: Size Limit check (Category video limit scope-patched) ──
        print("\n[TEST 9] Uploading oversized file (patched limit)...")
        original_limits = validation.SIZE_LIMITS.copy()
        validation.SIZE_LIMITS["video"] = 50

        # Upload 100 bytes video
        large_video_content = b"\x00\x00\x00\x18ftypmp42" + b"x" * 90
        large_video_file = io.BytesIO(large_video_content)

        response = client.post(
            "/api/upload-video",
            files={"video": ("lecture.mp4", large_video_file, "video/mp4")},
            headers=admin_headers
        )
        # Restore limits
        validation.SIZE_LIMITS = original_limits

        if response.status_code == 400:
            assert "File size exceeds" in response.json()["detail"]
            print("  PASS: Oversized file was rejected with a clear size limit exceeded message.")
        else:
            print(f"  FAIL: Expected 400, got {response.status_code}. Response: {response.text}")
            errors += 1

        # ── Test 10: Invalid Video URL Domain ──
        print("\n[TEST 10] Submitting video with invalid domain...")
        payload = {
            "title": "Malicious Video",
            "video_url": "https://attacker.com/exploit.mp4"
        }
        response = client.post(
            f"/api/courses/modules/{module.id}/videos",
            json=payload,
            headers=admin_headers
        )
        if response.status_code == 400:
            print("  PASS: Video URL with untrusted domain was rejected.")
        else:
            print(f"  FAIL: Expected 400, got {response.status_code}. Response: {response.text}")
            errors += 1

        # ── Test 11: Allowed Video URL Domains ──
        print("\n[TEST 11] Submitting video with allowed domains...")
        allowed_urls = [
            "https://www.youtube.com/watch?v=123",
            "https://youtu.be/123",
            "https://vimeo.com/123",
            "pub-15434e9e4db6402892098a597dc510ea.r2.dev/video.mp4",
            "/uploads/notes/test.mp4"
        ]
        
        for url in allowed_urls:
            payload = {
                "title": f"Valid Video - {url[:20]}",
                "video_url": url
            }
            response = client.post(
                f"/api/courses/modules/{module.id}/videos",
                json=payload,
                headers=admin_headers
            )
            if response.status_code == 200:
                print(f"  PASS: Video URL '{url[:40]}...' was accepted.")
            else:
                print(f"  FAIL: Expected 200 for video URL '{url}', got {response.status_code}. Response: {response.text}")
                errors += 1

        # ── Test 12: Allowed ZIP with Safe Files ──
        print("\n[TEST 12] Uploading safe ZIP archive for task submission...")
        safe_zip_data = io.BytesIO()
        with zipfile.ZipFile(safe_zip_data, 'w') as z:
            z.writestr("src/main.py", "print('hello')")
            z.writestr("README.md", "# Documentation")
            z.writestr("data/table.xlsx", "excel content")
        safe_zip_bytes = safe_zip_data.getvalue()
        safe_zip_file = io.BytesIO(safe_zip_bytes)

        response = client.post(
            f"/api/modules/{module.id}/submit",
            files={"file": ("project.zip", safe_zip_file, "application/zip")},
            headers=employee_headers
        )
        if response.status_code == 200:
            print("  PASS: Safe ZIP upload was successfully allowed.")
        else:
            print(f"  FAIL: Expected 200, got {response.status_code}. Response: {response.text}")
            errors += 1

        # ── Test 13: Blocked ZIP with Malicious executable file ──
        print("\n[TEST 13] Uploading ZIP containing blocked script file...")
        unsafe_zip_data = io.BytesIO()
        with zipfile.ZipFile(unsafe_zip_data, 'w') as z:
            z.writestr("src/exploit.bat", "@echo off")
        unsafe_zip_bytes = unsafe_zip_data.getvalue()
        unsafe_zip_file = io.BytesIO(unsafe_zip_bytes)

        response = client.post(
            f"/api/modules/{module.id}/submit",
            files={"file": ("exploit.zip", unsafe_zip_file, "application/zip")},
            headers=employee_headers
        )
        if response.status_code == 400:
            assert response.json()["detail"] == "Only PDF, DOCX, JPG, PNG and MP4 files are allowed."
            print("  PASS: Unsafe ZIP containing nested `.bat` script was blocked.")
        else:
            print(f"  FAIL: Expected 400, got {response.status_code}. Response: {response.text}")
            errors += 1

        # ── Test 14: Audit Log Verification ──
        print("\n[TEST 14] Verifying FILE_UPLOAD_BLOCKED audit log records...")
        blocked_log = db.query(AuditLog).filter(
            AuditLog.action == "FILE_UPLOAD_BLOCKED",
            AuditLog.company_id == company.id
        ).order_by(AuditLog.id.desc()).first()

        if blocked_log:
            print("  PASS: FILE_UPLOAD_BLOCKED record found in AuditLog table.")
            details = json.loads(blocked_log.details)
            print("  Log fields:")
            print(f"    User Email: {details.get('user_email')}")
            print(f"    Client IP: {details.get('client_ip')}")
            print(f"    File Name: {details.get('file_name')}")
            print(f"    Extension: {details.get('file_extension')}")
            print(f"    MIME Type: {details.get('mime_type')}")
            print(f"    Upload Location: {details.get('upload_location')}")
            print(f"    Reason: {details.get('reason')}")
            
            # Verify required details fields exist
            assert details.get("user_id") is not None
            assert details.get("user_email") == employee_user.email
            assert details.get("file_name") == "exploit.zip"
            assert details.get("file_extension") == ".zip"
            assert details.get("upload_location") == "submissions"
            print("  PASS: All requested log metadata is verified successfully.")
        else:
            print("  FAIL: No FILE_UPLOAD_BLOCKED record found in database.")
            errors += 1

        print("\n=== TESTS COMPLETE ===")
        if errors == 0:
            print("ALL UPLOAD VALIDATION TESTS PASSED SUCCESSFULLY!")
            cleanup_db("Test Upload Co")
            sys.exit(0)
        else:
            print(f"{errors} TESTS FAILED!")
            cleanup_db("Test Upload Co")
            sys.exit(1)

    except AssertionError as e:
        print(f"\n[FAIL] Test assertion failed: {e}")
        cleanup_db("Test Upload Co")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        cleanup_db("Test Upload Co")
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
