from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from auth import require_roles
from r2_utils import upload_video_to_r2

router = APIRouter(tags=["Upload"])

@router.post("/upload-video")
def upload_video(video: UploadFile = File(...), current_user=Depends(require_roles(["admin"]))):
    # Validate file type
    if not video.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Only video files are allowed")
    
    # Optional: Validate extension (specifically mp4 as per requirements)
    ext = video.filename.split('.')[-1].lower() if '.' in video.filename else ''
    if ext != 'mp4' and video.content_type != 'video/mp4':
        raise HTTPException(status_code=400, detail="Only MP4 videos are allowed")

    try:
        # Optional: Add progress logging or retry logic if needed inside the util
        video_url = upload_video_to_r2(video)
        return {"video_url": video_url}
    except Exception as e:
        print(f"Error uploading video to R2: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload video")
