from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import Company

router = APIRouter(prefix="/payment", tags=["Payment"])

@router.post("/fake")
def fake_payment(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="User does not belong to a company")
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Fake Payment Logic
    company.payment_status = "completed"
    company.is_paid = True
    db.commit()
    
    return {
        "status": "success",
        "message": "Payment successful!",
        "company_id": company_id
    }
