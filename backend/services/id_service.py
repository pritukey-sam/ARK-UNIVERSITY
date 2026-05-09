from sqlalchemy.orm import Session
from sqlalchemy import func
from models import User, Company

def generate_user_id(db: Session, company_id: int, role: str) -> str:
    # Get company code
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        return None
    
    code = company.company_code or "LUM"
    role_initial = "E" if role == "employee" else "HR"
    
    # Count existing users with this role in this company
    count = db.query(func.count(User.id)).filter(
        User.company_id == company_id,
        User.role == role
    ).scalar()
    
    next_num = count + 1
    return f"{code}-{role_initial}{next_num:03d}"
