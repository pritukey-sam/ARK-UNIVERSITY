from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Company, User
from auth import hash_password, validate_email_format
from schemas import CompanyWithAdminCreate
import random
import string

router = APIRouter(tags=["Registration"])

def generate_company_code(name: str, db: Session):
    base_code = "".join([w[0].upper() for w in name.split() if w])[:5]
    if not base_code:
        base_code = "".join(random.choices(string.ascii_uppercase, k=3))
    
    company_code = base_code
    counter = 1
    while db.query(Company).filter(Company.company_code == company_code).first():
        company_code = f"{base_code}{counter}"
        counter += 1
    return company_code

@router.post("/register-company")
def register_company(body: CompanyWithAdminCreate, db: Session = Depends(get_db)):
    # Check if email format is valid
    if not validate_email_format(body.admin_email):
        raise HTTPException(status_code=400, detail="Invalid email address format")
        
    # Check if email exists
    existing_user = db.query(User).filter(User.email == body.admin_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Admin email already exists")

    # Determine status based on plan
    # If FREE: active, If PAID: pending
    status = "active" if body.plan_type.lower() == "free" else "pending"
    
    # Create Company
    company_code = generate_company_code(body.name, db)
    new_company = Company(
        name=body.name,
        plan_type=body.plan_type,
        plan_price=body.plan_price,
        company_code=company_code,
        status=status
    )
    db.add(new_company)
    db.commit()
    db.refresh(new_company)

    # Create Admin User
    initials = "".join([n[0].upper() for n in body.admin_name.split()[:2]])
    new_admin = User(
        name=body.admin_name,
        email=body.admin_email,
        password_hash=hash_password(body.admin_password),
        role="admin",
        company_id=new_company.id,
        avatar_initials=initials
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    return {
        "message": "Registration successful" if status == "active" else "Registration request sent. Pending approval.",
        "status": status,
        "company_id": new_company.id
    }
