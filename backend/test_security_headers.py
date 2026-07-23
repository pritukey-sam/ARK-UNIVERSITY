import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

def run_tests():
    print("=== STARTING SECURITY HEADERS TESTS ===")
    errors = 0
    client = TestClient(app)

    # Cache original ENV state
    original_env = os.environ.get("ENV")

    try:
        # ────────── TEST 1: Development/Localhost CSP Headers ──────────
        print("\n[TEST 1] Testing Development/Localhost CSP Headers...")
        
        # Ensure ENV is set to development
        os.environ["ENV"] = "development"
        
        response = client.get("/health", headers={"Host": "localhost"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        headers = response.headers
        
        # Verify header presence
        assert "X-Frame-Options" in headers, "X-Frame-Options header missing"
        assert headers["X-Frame-Options"] == "DENY", f"Expected DENY, got {headers['X-Frame-Options']}"
        print("  PASS: X-Frame-Options is DENY")

        assert "X-Content-Type-Options" in headers, "X-Content-Type-Options header missing"
        assert headers["X-Content-Type-Options"] == "nosniff", f"Expected nosniff, got {headers['X-Content-Type-Options']}"
        print("  PASS: X-Content-Type-Options is nosniff")

        assert "Referrer-Policy" in headers, "Referrer-Policy header missing"
        assert headers["Referrer-Policy"] == "strict-origin-when-cross-origin", f"Expected strict-origin-when-cross-origin, got {headers['Referrer-Policy']}"
        print("  PASS: Referrer-Policy is strict-origin-when-cross-origin")

        assert "Permissions-Policy" in headers, "Permissions-Policy header missing"
        perm_policy = headers["Permissions-Policy"]
        expected_perms = ["geolocation=()", "microphone=()", "camera=()", "payment=()", "usb=()", "magnetometer=()", "gyroscope=()"]
        for perm in expected_perms:
            assert perm in perm_policy, f"Expected permission policy {perm} in {perm_policy}"
        print("  PASS: Permissions-Policy correctly disables browser features")

        assert "Content-Security-Policy" in headers, "Content-Security-Policy header missing"
        csp = headers["Content-Security-Policy"]
        
        # Development CSP checks
        assert "'unsafe-inline'" in csp, "unsafe-inline missing from dev CSP"
        assert "'unsafe-eval'" in csp, "unsafe-eval missing from dev CSP"
        assert "ws://localhost:*" in csp, "ws://localhost:* connection permission missing in dev CSP"
        assert "http://127.0.0.1:*" in csp, "http://127.0.0.1:* connection permission missing in dev CSP"
        assert "https://pub-15434e9e4db6402892098a597dc510ea.r2.dev" in csp, "Cloudflare R2 domain missing in dev CSP"
        assert "https://www.youtube.com" in csp, "YouTube frame-src/script-src missing in dev CSP"
        assert "https://player.vimeo.com" in csp, "Vimeo frame-src/script-src missing in dev CSP"
        
        # Confirm no wildcards for R2 and fonts
        assert "*.r2.dev" not in csp, "Overly broad R2 wildcard detected in dev CSP"
        assert "*.gstatic.com" not in csp, "Overly broad Google Fonts wildcard detected in dev CSP"
        assert "*.generativeai.google.com" not in csp, "Unnecessary Gemini API wildcard detected in dev CSP"
        print("  PASS: Development/Localhost CSP verified successfully")

        # ────────── TEST 2: Production CSP Headers ──────────
        print("\n[TEST 2] Testing Production CSP Headers (Stricter)...")
        
        # Switch environment to production and mock a production hostname
        os.environ["ENV"] = "production"
        
        response = client.get("/health", headers={"Host": "api.arklms.com"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        headers = response.headers
        assert "Content-Security-Policy" in headers, "Content-Security-Policy header missing in production"
        csp_prod = headers["Content-Security-Policy"]
        
        # Production CSP checks (unsafe-eval and dev sockets must be omitted from script-src & connect-src)
        assert "'unsafe-eval'" not in csp_prod, "unsafe-eval must be omitted from production CSP script-src"
        
        # Check script-src explicitly to verify 'unsafe-inline' is absent
        script_src_directive = [d.strip() for d in csp_prod.split(';') if d.strip().startswith("script-src")][0]
        assert "'unsafe-inline'" not in script_src_directive, "unsafe-inline must be omitted from production CSP script-src"
        
        # Verify connects
        connect_src_directive = [d.strip() for d in csp_prod.split(';') if d.strip().startswith("connect-src")][0]
        assert "ws://localhost:*" not in connect_src_directive, "dev websocket endpoints must be omitted from production connect-src"
        assert "http://127.0.0.1:*" not in connect_src_directive, "dev localhost connections must be omitted from production connect-src"
        
        # Verify exact domains still exist
        assert "https://pub-15434e9e4db6402892098a597dc510ea.r2.dev" in csp_prod, "R2 domain missing in production CSP"
        assert "https://www.youtube.com" in csp_prod, "YouTube domain missing in production CSP"
        assert "https://player.vimeo.com" in csp_prod, "Vimeo domain missing in production CSP"
        
        # Confirm no wildcards for R2 and fonts
        assert "*.r2.dev" not in csp_prod, "Overly broad R2 wildcard detected in production CSP"
        assert "*.gstatic.com" not in csp_prod, "Overly broad Google Fonts wildcard detected in production CSP"
        assert "*.generativeai.google.com" not in csp_prod, "Unnecessary Gemini API wildcard detected in production CSP"
        print("  PASS: Production CSP verified successfully (no unsafe-eval, no unsafe-inline in script-src, no localhost connect)")

        # ────────── TEST 3: Static Upload Routes Headers ──────────
        print("\n[TEST 3] Testing Static Route Headers...")
        
        # Request a static file route (FastAPI static files mount)
        # Even if file doesn't exist, it should hit ASGI CustomStaticFiles handler and apply middleware headers
        response = client.get("/uploads/assignments/test_missing_file.pdf")
        
        headers = response.headers
        assert "X-Frame-Options" in headers, "Static file response missing X-Frame-Options"
        assert headers["X-Frame-Options"] == "DENY", "Static file response X-Frame-Options is not DENY"
        assert "X-Content-Type-Options" in headers, "Static file response missing X-Content-Type-Options"
        assert headers["X-Content-Type-Options"] == "nosniff", "Static file response X-Content-Type-Options is not nosniff"
        assert "Content-Security-Policy" in headers, "Static file response missing CSP"
        print("  PASS: Static route security headers verified successfully")

        # ────────── TEST 4: API Endpoint Functional Integrity ──────────
        print("\n[TEST 4] Testing Existing Endpoints Functionality...")
        
        # Public health check
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
        print("  PASS: Health check endpoint returned healthy status normally")
        
        # Public index root
        response = client.get("/")
        assert response.status_code == 200
        assert "status" in response.json()
        print("  PASS: Root endpoint functional")

    except AssertionError as ae:
        print(f"FAIL: {ae}")
        errors += 1
    except Exception as e:
        print(f"ERROR: Unexpected error during security headers validation: {e}")
        errors += 1
    finally:
        # Restore environment state
        if original_env is None:
            os.environ.pop("ENV", None)
        else:
            os.environ["ENV"] = original_env

    print("\n=== TESTS COMPLETE ===")
    if errors == 0:
        print("ALL SECURITY HEADERS TESTS PASSED SUCCESSFULLY!")
        return True
    else:
        print(f"SECURITY HEADERS TESTS FAILED WITH {errors} ERRORS.")
        return False

if __name__ == "__main__":
    run_tests()
