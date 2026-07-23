import sys
import os
import time

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import User, Company, AuditLog
from auth import hash_password
from services.rate_limiter import login_rate_limiter

def run_tests():
    print("=== STARTING LOGIN RATE LIMITING TESTS ===")
    
    # Set up database session and create test company & users
    db = SessionLocal()
    client = TestClient(app)
    
    # Clean up any leftover test data first
    try:
        company_obj = db.query(Company).filter(Company.name == "Test Rate Limit Co").first()
        if company_obj:
            db.query(AuditLog).filter(AuditLog.company_id == company_obj.id).delete()
            db.commit()
        db.query(User).filter(User.email.like("%@test-rate-limit.com")).delete()
        db.query(Company).filter(Company.name == "Test Rate Limit Co").delete()
        db.commit()
    except Exception as cleanup_err:
        db.rollback()
        print(f"Initial cleanup failed (probably normal): {cleanup_err}")
    
    try:
        # Create active test company
        company = Company(
            name="Test Rate Limit Co",
            plan_type="paid",
            status="active",
            plan_price=10.0,
            company_code="TRL",
            payment_status="completed",
            is_paid=True
        )
        db.add(company)
        db.commit()
        db.refresh(company)
        
        # Create test users for different roles
        roles = ["admin", "hr", "employee", "super_admin"]
        user_passwords = {}
        for role in roles:
            email = f"test_{role}@test-rate-limit.com"
            user_passwords[role] = "password123"
            user = User(
                email=email,
                password_hash=hash_password("password123"),
                name=f"Test {role.upper()}",
                role=role,
                company_id=company.id,
                is_active=True,
                is_first_login=False
            )
            db.add(user)
        db.commit()
        
        # Reset rate limiter to a clean state
        login_rate_limiter.email_attempts.clear()
        login_rate_limiter.ip_attempts.clear()
        
        print("\n[TEST 1] Failed Login Test (Email Lockout)")
        target_email = "nonexistent@test-rate-limit.com"
        mock_ip = "10.0.0.1"
        
        # 5 failed attempts
        for i in range(5):
            response = client.post(
                "/api/login",
                json={"email": target_email, "password": "wrongpassword"},
                headers={"X-Forwarded-For": mock_ip}
            )
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            print(f"  Attempt {i+1} failed with 401 as expected")
            
        # The 6th attempt should trigger email rate limiting
        response = client.post(
            "/api/login",
            json={"email": target_email, "password": "wrongpassword"},
            headers={"X-Forwarded-For": mock_ip}
        )
        assert response.status_code == 429, f"Expected 429, got {response.status_code}"
        assert response.json()["detail"] == "Too many login attempts. Please try again after 15 minutes.", f"Unexpected detail message: {response.json()}"
        print("  6th attempt failed with 429 and correct message")
        
        # Verify Audit Logs for Email lockout
        logs = db.query(AuditLog).filter(AuditLog.action == "LOGIN_RATE_LIMIT_EMAIL", AuditLog.target == target_email).all()
        assert len(logs) > 0, "No audit log entry created for LOGIN_RATE_LIMIT_EMAIL"
        print("  Verified LOGIN_RATE_LIMIT_EMAIL audit log exists in DB")
        
        # Reset limiter for next test
        login_rate_limiter.email_attempts.clear()
        login_rate_limiter.ip_attempts.clear()
        
        print("\n[TEST 2] Failed Login Test (IP Lockout)")
        mock_ip = "10.0.0.2"
        # 20 failed attempts from same IP but different emails
        for i in range(20):
            email = f"diff_email_{i}@test-rate-limit.com"
            response = client.post(
                "/api/login",
                json={"email": email, "password": "wrongpassword"},
                headers={"X-Forwarded-For": mock_ip}
            )
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            
        print("  20 failed attempts from same IP completed")
        # 21st attempt should be blocked
        response = client.post(
            "/api/login",
            json={"email": "another_email@test-rate-limit.com", "password": "wrongpassword"},
            headers={"X-Forwarded-For": mock_ip}
        )
        assert response.status_code == 429, f"Expected 429, got {response.status_code}"
        assert response.json()["detail"] == "Too many login attempts. Please try again after 15 minutes."
        print("  21st attempt blocked with 429 due to IP lockout")
        
        # Verify Audit Logs for IP lockout
        logs = db.query(AuditLog).filter(AuditLog.action == "LOGIN_RATE_LIMIT_IP", AuditLog.details.like(f"%IP: {mock_ip}%")).all()
        assert len(logs) > 0, "No audit log entry created for LOGIN_RATE_LIMIT_IP"
        print("  Verified LOGIN_RATE_LIMIT_IP audit log exists in DB")
        
        # Reset limiter
        login_rate_limiter.email_attempts.clear()
        login_rate_limiter.ip_attempts.clear()
        
        print("\n[TEST 3] Successful Login Reset Test (Email Counter)")
        test_email = "test_employee@test-rate-limit.com"
        mock_ip = "10.0.0.3"
        
        # Fail 3 times
        for i in range(3):
            response = client.post(
                "/api/login",
                json={"email": test_email, "password": "wrongpassword"},
                headers={"X-Forwarded-For": mock_ip}
            )
            assert response.status_code == 401
            
        print("  Failed 3 times")
        # Login successfully
        response = client.post(
            "/api/login",
            json={"email": test_email, "password": "password123"},
            headers={"X-Forwarded-For": mock_ip}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("  Logged in successfully")
        
        # Now fail 3 more times, and verify it does NOT trigger 429 (since the count was reset on success)
        for i in range(3):
            response = client.post(
                "/api/login",
                json={"email": test_email, "password": "wrongpassword"},
                headers={"X-Forwarded-For": mock_ip}
            )
            assert response.status_code == 401
        print("  Failed 3 more times after success (total 6 fails, but separated by success; should not block)")
        
        # Verify 4th post-success fail (which is 7th total attempt) does not block
        response = client.post(
            "/api/login",
            json={"email": test_email, "password": "wrongpassword"},
            headers={"X-Forwarded-For": mock_ip}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("  Verified email counter successfully reset on successful login")
        
        # Reset limiter
        login_rate_limiter.email_attempts.clear()
        login_rate_limiter.ip_attempts.clear()
        
        print("\n[TEST 4] IP Counter Non-Reset Test")
        mock_ip = "10.0.0.4"
        valid_email = "test_employee@test-rate-limit.com"
        
        # Fail 19 times from this IP using different emails
        for i in range(19):
            email = f"ip_non_reset_{i}@test-rate-limit.com"
            response = client.post(
                "/api/login",
                json={"email": email, "password": "wrongpassword"},
                headers={"X-Forwarded-For": mock_ip}
            )
            assert response.status_code == 401
        print("  Failed 19 times from IP")
        
        # Log in successfully with valid email from same IP
        response = client.post(
            "/api/login",
            json={"email": valid_email, "password": "password123"},
            headers={"X-Forwarded-For": mock_ip}
        )
        assert response.status_code == 200
        print("  Successful login from same IP")
        
        # Fail 1 more time from same IP (reaches 20 fails total)
        response = client.post(
            "/api/login",
            json={"email": "one_more_fail@test-rate-limit.com", "password": "wrongpassword"},
            headers={"X-Forwarded-For": mock_ip}
        )
        assert response.status_code == 401
        print("  Failed 20th time from IP")
        
        # Attempt 21 (should block with 429, proving the IP counter was NOT cleared on successful login)
        response = client.post(
            "/api/login",
            json={"email": "final_attempt@test-rate-limit.com", "password": "wrongpassword"},
            headers={"X-Forwarded-For": mock_ip}
        )
        assert response.status_code == 429, f"Expected 429, got {response.status_code}"
        assert response.json()["detail"] == "Too many login attempts. Please try again after 15 minutes."
        print("  Verified IP counter was kept intact and blocks on 21st attempt")
        
        print("\n[TEST 5] Scope Restriction Test")
        # Check non-login endpoints are unaffected by rate limiting
        # /health endpoint should return 200
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
        print("  Verified /health is unaffected")
        
        print("\n[TEST 6] Normal User Flow (All Roles Login)")
        for role in roles:
            email = f"test_{role}@test-rate-limit.com"
            response = client.post(
                "/api/login",
                json={"email": email, "password": "password123"}
            )
            assert response.status_code == 200, f"Failed login for role {role}: {response.json()}"
            print(f"  Successfully verified {role} login works")
            
        print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")
        
    except AssertionError as e:
        print(f"\n[FAIL] Test assertion failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # Clean up database
        print("\nCleaning up test users and company...")
        try:
            company_obj = db.query(Company).filter(Company.name == "Test Rate Limit Co").first()
            if company_obj:
                db.query(AuditLog).filter(AuditLog.company_id == company_obj.id).delete()
                db.commit()
            db.query(User).filter(User.email.like("%@test-rate-limit.com")).delete()
            db.query(Company).filter(Company.name == "Test Rate Limit Co").delete()
            db.commit()
        except Exception as cleanup_err:
            db.rollback()
            print(f"Final cleanup failed: {cleanup_err}")
        db.close()
        
if __name__ == "__main__":
    run_tests()
