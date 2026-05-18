from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user, hash_password
from models import User, Company
from pydantic import BaseModel
from typing import Optional, List
from schemas import UserOut

router = APIRouter(prefix="/account", tags=["User"])

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country_code: Optional[str] = None
    password: Optional[str] = None

@router.get("/profile")
def get_profile(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        user = db.query(User).filter(User.id == current_user["id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        company = db.query(Company).filter(Company.id == user.company_id).first()
        
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "avatar_initials": user.avatar_initials,
            "employee_id": user.employee_id,
            "company_id": user.company_id,
            "company_name": company.name if company else None,
            "company_code": company.company_code if company else None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            "plan_type": company.plan_type if company else "free",
            "avatar_url": user.avatar_url,
            "phone": user.phone,
            "country_code": user.country_code
        }
    except Exception as e:
        print(f"ERROR IN GET_PROFILE: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/profile")
def update_profile(body: ProfileUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user = db.query(User).filter(User.id == current_user["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if body.name: user.name = body.name
    if body.email: 
        normalized_email = body.email.strip().lower()
        if not normalized_email:
            raise HTTPException(status_code=400, detail="Email cannot be empty")
            
        existing = db.query(User).filter(User.email == normalized_email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use by another account")
        user.email = normalized_email
    if body.phone is not None: user.phone = body.phone
    if body.country_code is not None: user.country_code = body.country_code
    if body.password:
        user.password_hash = hash_password(body.password)
        
    db.commit()
    db.refresh(user)
    return {"message": "Profile updated successfully"}

@router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user = db.query(User).filter(User.id == current_user["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Save file
    import os
    import shutil
    from datetime import datetime
    
    upload_dir = "uploads/avatars"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        
    ext = file.filename.split(".")[-1]
    filename = f"avatar_{user.id}_{int(datetime.now().timestamp())}.{ext}"
    filepath = os.path.join(upload_dir, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    user.avatar_url = f"/uploads/avatars/{filename}"
    db.commit()
    
    return {"avatar_url": user.avatar_url}

@router.delete("/avatar")
def delete_avatar(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user = db.query(User).filter(User.id == current_user["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Optional: Delete the physical file here if needed
    user.avatar_url = None
    db.commit()
    return {"message": "Avatar removed"}
