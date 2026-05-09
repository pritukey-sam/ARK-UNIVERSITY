from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import get_db
from models import Company, User, Course, QuizAttempt, ActivityLog
from schemas import CompanyWithAdminCreate, CompanyOut, CompanyUpdate, RegistrationApproval
from auth import require_roles, hash_password
from typing import List
from datetime import datetime, timedelta

router = APIRouter(prefix="/super-admin", tags=["Super Admin"])

def log_activity(db: Session, action: str, company_id: int = None, user_id: int = None, details: str = None):
    log = ActivityLog(action=action, company_id=company_id, user_id=user_id, details=details)
    db.add(log)
    db.commit()

@router.get("/companies", response_model=List[CompanyOut])
def list_companies(db: Session = Depends(get_db), current_user=Depends(require_roles(["super_admin"]))):
    companies = db.query(Company).all()
    # Add employee count dynamically for each company
    for c in companies:
        c.employee_count = db.query(User).filter(User.company_id == c.id).count()
    return companies

@router.get("/stats")
def get_global_stats(db: Session = Depends(get_db), current_user=Depends(require_roles(["super_admin"]))):
    total_revenue = db.query(Company).filter(Company.plan_type == "paid").with_entities(Company.plan_price).all()
    revenue_sum = sum([r[0] for r in total_revenue])
    
    return {
        "total_revenue": revenue_sum,
        "paid_companies": db.query(Company).filter(Company.plan_type == "paid").count(),
        "free_companies": db.query(Company).filter(Company.plan_type == "free").count(),
        "total_users": db.query(User).count(),
        "total_courses": db.query(Course).count(),
        "total_quiz_attempts": db.query(QuizAttempt).count(),
        "active_users_7d": db.query(User).count(), # Simplified for now
        "avg_revenue": revenue_sum / len(total_revenue) if total_revenue else 0
    }

@router.get("/logs")
def get_activity_logs(db: Session = Depends(get_db), current_user=Depends(require_roles(["super_admin"]))):
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(100).all()
    return [
        {
            "id": l.id,
            "action": l.action,
            "company_name": l.company.name if l.company else "System",
            "user_name": l.user.name if l.user else "System",
            "details": l.details,
            "created_at": l.created_at
        } for l in logs
    ]

@router.get("/growth")
def get_growth_data(db: Session = Depends(get_db), current_user=Depends(require_roles(["super_admin"]))):
    """Return real monthly growth data for last 6 months."""
    result = []
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        ref = now.replace(day=1)
        # Go back i months
        month_num = ref.month - i
        year = ref.year + (month_num - 1) // 12
        month = ((month_num - 1) % 12) + 1
        month_name = datetime(year, month, 1).strftime("%b")

        companies_count = db.query(Company).filter(
            extract('year', Company.created_at) == year,
            extract('month', Company.created_at) == month
        ).count()

        users_count = db.query(User).filter(
            extract('year', User.created_at) == year,
            extract('month', User.created_at) == month
        ).count()

        # Cumulative MRR from paid companies created up to that month
        month_end = datetime(year, month, 28) + timedelta(days=4)
        revenue = db.query(func.coalesce(func.sum(Company.plan_price), 0)).filter(
            Company.plan_type == "paid",
            Company.created_at <= month_end
        ).scalar() or 0

        result.append({"name": month_name, "companies": companies_count, "users": users_count, "revenue": float(revenue)})
    return result

@router.post("/companies")
def create_company(body: CompanyWithAdminCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(["super_admin"]))):
    # Generate company code from name if not provided
    company_code = body.company_code
    if not company_code:
        company_code = "".join([w[0].upper() for w in body.name.split() if w])[:5]
        # Ensure uniqueness
        base_code = company_code
        counter = 1
        while db.query(Company).filter(Company.company_code == company_code).first():
            company_code = f"{base_code}{counter}"
            counter += 1

    # Check if company code exists (redundant now but safe)
    existing = db.query(Company).filter(Company.company_code == company_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Company code already exists")
    
    # Check if email exists
    existing_user = db.query(User).filter(User.email == body.admin_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Admin email already exists")

    # Create Company
    new_company = Company(
        name=body.name,
        plan_type=body.plan_type,
        plan_price=body.plan_price,
        company_code=company_code
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

    log_activity(db, "Company Created", company_id=new_company.id, details=f"Created {new_company.name} with admin {body.admin_email}")
    return {"message": "Company and Admin created successfully", "company": new_company, "admin": new_admin}

@router.patch("/companies/{company_id}/plan")
def update_company_plan(company_id: int, plan_type: str, plan_price: float, db: Session = Depends(get_db), current_user=Depends(require_roles(["super_admin"]))):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company.plan_type = plan_type
    company.plan_price = plan_price
    db.commit()
    return {"message": "Plan updated successfully", "plan": plan_type, "price": plan_price}

@router.patch("/companies/{company_id}")
def update_company(company_id: int, body: CompanyUpdate, db: Session = Depends(get_db), current_user=Depends(require_roles(["super_admin"]))):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    if body.name is not None: company.name = body.name
    if body.plan_type is not None: company.plan_type = body.plan_type
    if body.plan_price is not None: company.plan_price = body.plan_price
    if body.is_suspended is not None: company.is_suspended = body.is_suspended
    if body.expiry_date is not None: company.expiry_date = body.expiry_date
    
    if body.company_code is not None:
        # Check if code is already taken
        existing = db.query(Company).filter(Company.company_code == body.company_code, Company.id != company_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Company code already exists")
        company.company_code = body.company_code
        
    db.commit()
    db.refresh(company)
    
    log_activity(db, "Company Updated", company_id=company.id, details=f"Updated settings for {company.name}")
    return {"message": "Company updated successfully", "company": company}

@router.get("/registration-requests")
def list_registration_requests(db: Session = Depends(get_db), current_user=Depends(require_roles(["super_admin"]))):
    requests = db.query(Company).filter(Company.status != "active").all()
    # Find the admin user for each company request
    results = []
    for r in requests:
        admin = db.query(User).filter(User.company_id == r.id, User.role == "admin").first()
        results.append({
            "id": r.id,
            "name": r.name,
            "plan_type": r.plan_type,
            "status": r.status,
            "created_at": r.created_at,
            "admin_name": admin.name if admin else "N/A",
            "admin_email": admin.email if admin else "N/A"
        })
    return results

@router.post("/registration-requests/{company_id}/approve")
def approve_registration(company_id: int, body: RegistrationApproval, db: Session = Depends(get_db), current_user=Depends(require_roles(["super_admin"]))):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company request not found")
    
    # Apply overrides from Super Admin
    company.status = "active"
    company.plan_type = body.plan_type
    company.plan_price = body.plan_price if body.plan_type == "paid" else 0.0
    
    db.commit()
    
    log_activity(db, "Company Approved", company_id=company.id, details=f"Approved {company.name} as {body.plan_type} plan")
    return {"message": f"Company {company.name} approved and activated successfully"}

@router.post("/registration-requests/{company_id}/reject")
def reject_registration(company_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(["super_admin"]))):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company request not found")
    
    company.status = "rejected"
    # Optional: Delete company and users if rejected? The requirement says "Delete or mark rejected". 
    # I'll mark as rejected for audit trail, but user can't login anyway.
    db.commit()
    
    log_activity(db, "Company Rejected", company_id=company.id, details=f"Rejected registration for {company.name}")
    return {"message": f"Company {company.name} rejected"}

