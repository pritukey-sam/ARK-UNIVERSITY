from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import os
import traceback
from database import SessionLocal
from models import User, Company

JWT_SECRET = os.getenv("JWT_SECRET", "lumina-lms-secret-key-2024")
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def generate_token(user_id: int, email: str, role: str, company_id: int = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    return jwt.encode({"id": user_id, "email": email, "role": role, "company_id": company_id, "exp": expire}, JWT_SECRET, algorithm=ALGORITHM)

def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    try:
        try:
            payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
            if payload.get("exp") and datetime.fromtimestamp(payload["exp"], tz=timezone.utc) < datetime.now(timezone.utc):
                 raise HTTPException(status_code=401, detail="Token expired")
        except (jwt.ExpiredSignatureError, JWTError):
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        
        company_id = payload.get("company_id")
        if company_id:
            db = SessionLocal()
            try:
                # Check user activity first
                user = db.query(User).filter(User.id == payload.get("id")).first()
                if user and not user.is_active:
                    raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact support.")

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
                
        return payload
    except HTTPException:
        raise
    except Exception as e:
        print("CRITICAL AUTH ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def require_roles(allowed_roles: list):
    def checker(user=Depends(get_current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Permission denied: insufficient role privileges")
        return user
    return checker
