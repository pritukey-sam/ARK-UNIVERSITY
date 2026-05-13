from sqlalchemy.orm import Session
from sqlalchemy import func
from models import User

def generate_user_id(db: Session, company_id: int, role: str) -> str:
    prefix = ""
    if role == "employee":
        prefix = "ARK"
    elif role == "hr":
        prefix = "HR"
    elif role == "admin" or role == "super_admin":
        prefix = "ADM"
    else:
        prefix = "USR"
        
    # Query latest existing ID for this prefix
    users = db.query(User.employee_id).filter(
        User.company_id == company_id,
        User.employee_id.like(f"{prefix}%")
    ).all()
    
    max_num = 0
    for u in users:
        emp_id = u[0]
        if emp_id and emp_id.startswith(prefix):
            try:
                num = int(emp_id[len(prefix):])
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
                
    next_num = max_num + 1
    return f"{prefix}{next_num:03d}"
