import sys
import os
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User

def normalize_ids():
    db: Session = SessionLocal()
    try:
        # For each role, find all users ordered by created_at ascending
        for role, prefix in [("employee", "ARK"), ("hr", "HR"), ("admin", "ADM"), ("super_admin", "ADM")]:
            users = db.query(User).filter(User.role == role).order_by(User.created_at.asc(), User.id.asc()).all()
            
            # Since multiple companies could exist, we should probably do this per company?
            # The prompt doesn't mention multiple companies for this cleanup, it just says "Find all existing employee users".
            # If there are multiple companies, ARK001, etc. should be per company.
            # Let's group by company_id
            
            companies = set([u.company_id for u in users])
            for cid in companies:
                company_users = [u for u in users if u.company_id == cid]
                for idx, user in enumerate(company_users):
                    new_id = f"{prefix}{(idx + 1):03d}"
                    user.employee_id = new_id
                    print(f"Updated {user.email} (Role: {role}, Company: {cid}) to {new_id}")
        
        db.commit()
        print("Migration complete!")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    normalize_ids()
