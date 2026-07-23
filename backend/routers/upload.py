from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from auth import require_roles
from r2_utils import upload_video_to_r2
from database import get_db
from validation import validate_and_log_upload
from sqlalchemy.orm import Session

router = APIRouter(tags=["Upload"])

@router.post("/upload-video")
def upload_video(
    request: Request,
    video: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin"]))
):
    validate_and_log_upload(video, "video", db, request, current_user, "video_lecture")

    try:
        video_url = upload_video_to_r2(video)
        return {"video_url": video_url}
    except Exception as e:
        print(f"Error uploading video to R2: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload video")
