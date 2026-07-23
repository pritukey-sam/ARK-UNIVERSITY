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
from services.account_lockout import account_lockout_manager
from services.rate_limiter import login_rate_limiter

def run_tests():
    print("=== STARTING ACCOUNT LOCKOUT TESTS ===")
    
    db = SessionLocal()
    client = TestClient(app)
    
    # Clean up test users and companies first
    try:
        company_obj = db.query(Company).filter(Company.name == "Test Lockout Co").first()
        if company_obj:
            db.query(AuditLog).filter(AuditLog.company_id == company_obj.id).delete()
            db.commit()
        db.query(User).filter(User.email.like("%@test-lockout.com")).delete()
        db.query(Company).filter(Company.name == "Test Lockout Co").delete()
        db.commit()
    except Exception as cleanup_err:
        db.rollback()
        print(f"Initial cleanup failed: {cleanup_err}")
        
    try:
        # Create active test company
        company = Company(
            name="Test Lockout Co",
            plan_type="paid",
            status="active",
            plan_price=10.0,
            company_code="TLC",
            payment_status="completed",
            is_paid=True
        )
        db.add(company)
        db.commit()
        db.refresh(company)
        
        # Create test users for different roles
        roles = ["admin", "hr", "employee", "super_admin"]
        for role in roles:
            email = f"test_{role}@test-lockout.com"
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
        
        # Reset lockout and rate limiter states
        account_lockout_manager.failed_attempts.clear()
        account_lockout_manager.lock_expirations.clear()
        account_lockout_manager.last_activity.clear()
        login_rate_limiter.email_attempts.clear()
        login_rate_limiter.ip_attempts.clear()
        
        print("\n[TEST 1 & 2] Account Lockout on 10th failure")
        target_email = "test_employee@test-lockout.com"
        mock_ip = "192.168.1.100"
        
        # 9 failed logins (should not trigger lockout, returns 401)
        for i in range(9):
            # Clear rate limiter email/IP lists to bypass layer 1 rate limits
            login_rate_limiter.email_attempts.clear()
            login_rate_limiter.ip_attempts.clear()
            
            response = client.post(
                "/api/login",
                json={"email": target_email, "password": "wrongpassword"},
                headers={"X-Forwarded-For": mock_ip}
            )
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            print(f"  Attempt {i+1} failed with 401 (Not locked yet)")
            
        # Verify account is NOT locked yet
        assert not account_lockout_manager.is_locked(target_email), "Account was locked before 10th attempt"
        
        # 10th failed login (triggers account lockout)
        login_rate_limiter.email_attempts.clear()
        login_rate_limiter.ip_attempts.clear()
        
        response = client.post(
            "/api/login",
            json={"email": target_email, "password": "wrongpassword"},
            headers={"X-Forwarded-For": mock_ip}
        )
        assert response.status_code == 401, f"Expected 401 on the 10th attempt, got {response.status_code}"
        print("  10th attempt failed with 401 as expected (lock triggers after this failure)")
        
        # Verify account IS locked now
        assert account_lockout_manager.is_locked(target_email), "Account should be locked after 10 failures"
        
        # Verify ACCOUNT_LOCKED audit log exists in DB
        logs = db.query(AuditLog).filter(
            AuditLog.action == "ACCOUNT_LOCKED", 
            AuditLog.target == target_email
        ).all()
        assert len(logs) > 0, "No audit log entry created for ACCOUNT_LOCKED"
        print("  Verified ACCOUNT_LOCKED audit log exists in DB")
        
        print("\n[TEST 3] Login attempt during lockout period")
        login_rate_limiter.email_attempts.clear()
        login_rate_limiter.ip_attempts.clear()
        
        response = client.post(
            "/api/login",
            json={"email": target_email, "password": "password123"}, # correct password but locked!
            headers={"X-Forwarded-For": mock_ip}
        )
        assert response.status_code == 423, f"Expected 423, got {response.status_code}"
        assert response.json()["detail"] == "Your account has been temporarily locked due to multiple failed login attempts. Please try again after 30 minutes.", f"Unexpected message: {response.json()}"
        print("  Attempt during lock period correctly blocked with HTTP 423 and exact message")
        
        print("\n[TEST 4] Automatic unlock simulation")
        # Fake lockout expiration by changing the timestamp in the manager to be in the past
        with account_lockout_manager.lock:
            account_lockout_manager.lock_expirations[target_email.lower()] = time.time() - 1.0
            
        # Check lockout - it should automatically unlock, reset failed counter, log ACCOUNT_UNLOCKED, and return 401 (since we pass wrong password)
        login_rate_limiter.email_attempts.clear()
        login_rate_limiter.ip_attempts.clear()
        
        response = client.post(
            "/api/login",
            json={"email": target_email, "password": "wrongpassword"},
            headers={"X-Forwarded-For": mock_ip}
        )
        # Should return 401 since it's unlocked now, but the password was wrong
        assert response.status_code == 401, f"Expected 401 after unlock, got {response.status_code}"
        
        # Verify lockout is cleared
        assert not account_lockout_manager.is_locked(target_email), "Account was not unlocked"
        
        # Verify ACCOUNT_UNLOCKED audit log exists in DB
        unlock_logs = db.query(AuditLog).filter(
            AuditLog.action == "ACCOUNT_UNLOCKED", 
            AuditLog.target == target_email
        ).all()
        assert len(unlock_logs) > 0, "No audit log entry created for ACCOUNT_UNLOCKED"
        print("  Verified automatic unlock occurred, returned 401, and wrote ACCOUNT_UNLOCKED audit log")
        
        print("\n[TEST 5] Successful Login Counter Reset")
        # Reset limiter and lockout manager
        account_lockout_manager.failed_attempts.clear()
        account_lockout_manager.lock_expirations.clear()
        login_rate_limiter.email_attempts.clear()
        login_rate_limiter.ip_attempts.clear()
        
        # Fail login 3 times
        for i in range(3):
            login_rate_limiter.email_attempts.clear()
            response = client.post(
                "/api/login",
                json={"email": target_email, "password": "wrongpassword"}
            )
            assert response.status_code == 401
            
        # Verify counter is 3
        assert account_lockout_manager.failed_attempts.get(target_email.lower()) == 3, f"Expected counter to be 3, got {account_lockout_manager.failed_attempts.get(target_email.lower())}"
        print("  Failed 3 times (counter is 3)")
        
        # Perform successful login
        response = client.post(
            "/api/login",
            json={"email": target_email, "password": "password123"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify counter is reset to 0
        assert account_lockout_manager.failed_attempts.get(target_email.lower()) == 0, f"Expected counter to be 0, got {account_lockout_manager.failed_attempts.get(target_email.lower())}"
        print("  Logged in successfully and verified counter reset to 0")
        
        print("\n[TEST 6] Normal User Flow (All Roles Login)")
        for role in roles:
            email = f"test_{role}@test-lockout.com"
            response = client.post(
                "/api/login",
                json={"email": email, "password": "password123"}
            )
            assert response.status_code == 200, f"Failed login for role {role}: {response.json()}"
            print(f"  Successfully verified {role} login works")
            
        print("\n=== ALL ACCOUNT LOCKOUT TESTS PASSED SUCCESSFULLY! ===")
        
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
            company_obj = db.query(Company).filter(Company.name == "Test Lockout Co").first()
            if company_obj:
                db.query(AuditLog).filter(AuditLog.company_id == company_obj.id).delete()
                db.commit()
            db.query(User).filter(User.email.like("%@test-lockout.com")).delete()
            db.query(Company).filter(Company.name == "Test Lockout Co").delete()
            db.commit()
        except Exception as cleanup_err:
            db.rollback()
            print(f"Final cleanup failed: {cleanup_err}")
        db.close()
        
if __name__ == "__main__":
    run_tests()
