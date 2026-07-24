from fastapi import Depends, HTTPException, Request
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import os
import traceback
import re
from database import SessionLocal
from models import User, Company

def validate_email_format(email: str) -> bool:
    if not email:
        return False
    if " " in email:
        return False
    email_regex = r"^[a-zA-Z0-9._%-]+(?:\+[a-zA-Z0-9._%-]+)?@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    import re
    return bool(re.match(email_regex, email.strip()))

JWT_SECRET = os.getenv("JWT_SECRET", "lumina-lms-secret-key-2024")
ALGORITHM = "HS256"

import bcrypt

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    try:
        plain_bytes = plain.encode('utf-8')[:72]
        hashed_bytes = hashed.encode('utf-8')
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        return False

def generate_token(user_id: int, email: str, role: str, company_id: int = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    return jwt.encode({"id": user_id, "email": email, "role": role, "company_id": company_id, "exp": expire}, JWT_SECRET, algorithm=ALGORITHM)

def get_current_user(request: Request):
    """
    Read JWT from HttpOnly cookie 'token'.
    Falls back to Authorization: Bearer header for backward-compatibility
    (e.g. internal test clients, curl).
    """
    try:
        # 1. Prefer HttpOnly cookie
        token = request.cookies.get("token")

        # 2. Fallback: Authorization: Bearer <token>
        if not token:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]

        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")

        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
            if payload.get("exp") and datetime.fromtimestamp(payload["exp"], tz=timezone.utc) < datetime.now(timezone.utc):
                raise HTTPException(status_code=401, detail="Token expired")
        except (jwt.ExpiredSignatureError, JWTError):
            raise HTTPException(status_code=401, detail="Could not validate credentials")

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == payload.get("id")).first()
            if not user:
                raise HTTPException(status_code=401, detail="User not found or deleted")

            if not user.is_active:
                raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact support.")

            # Check first-login status
            is_first_login_reset_api = request.url.path.endswith("/auth/first-login-reset")
            if getattr(user, 'is_first_login', False) and not is_first_login_reset_api:
                raise HTTPException(status_code=403, detail="First login password change required")
        finally:
            db.close()

        company_id = payload.get("company_id")
        if company_id:
            db = SessionLocal()
            try:
                company = db.query(Company).filter(Company.id == company_id).first()
                if company:
                    # Basic checks
                    if company.status == "pending":
                        raise HTTPException(status_code=403, detail="Your company account is pending approval.")
                    if company.status == "rejected":
                        raise HTTPException(status_code=403, detail="Your company registration request was rejected.")
                    if company.is_suspended:
                        raise HTTPException(status_code=403, detail="Your company account has been suspended.")

                    # Expiry check
                    if company.expiry_date:
                        now = datetime.now(timezone.utc)
                        expiry = company.expiry_date
                        if expiry.tzinfo is None:
                            expiry = expiry.replace(tzinfo=timezone.utc)
                        if expiry < now:
                            raise HTTPException(status_code=403, detail="Your company license has expired.")

                    # Payment check
                    is_payment_api = request.url.path.endswith("/payment/fake")
                    if company.plan_type == "paid" and company.payment_status != "completed" and not is_payment_api:
                        raise HTTPException(status_code=402, detail="Payment required. Please complete your subscription payment.")
            finally:
                db.close()

        # Lowercase the role for consistency in downstream checks
        if "role" in payload:
            payload["role"] = str(payload["role"]).lower()

        return payload
    except HTTPException:
        raise
    except Exception as e:
        print("CRITICAL AUTH ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def require_roles(allowed_roles: list):
    def checker(user=Depends(get_current_user)):
        user_role = str(user.get("role", "")).lower()
        allowed_lower = [str(r).lower() for r in allowed_roles]
        if user_role not in allowed_lower:
            raise HTTPException(status_code=403, detail="Permission denied: insufficient role privileges")
        return user
    return checker
