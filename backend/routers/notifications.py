from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import Notification
from schemas import NotificationOut, NotificationCount
from typing import List

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationOut])
def get_notifications(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    return db.query(Notification).filter(Notification.user_id == user_id).order_by(Notification.created_at.desc()).limit(20).all()

@router.get("/unread-count", response_model=NotificationCount)
def get_unread_count(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    count = db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).count()
    return {"unread_count": count}

@router.post("/{notification_id}/read")
def mark_as_read(notification_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"status": "success"}

@router.post("/mark-all-read")
def mark_all_read(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"status": "success"}
