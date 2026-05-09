import os
import uuid
import boto3
from fastapi import UploadFile

def get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=os.getenv('R2_ENDPOINT'),
        aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
        region_name='auto'  # R2 requires region_name='auto' usually, or it's ignored
    )

def upload_video_to_r2(file: UploadFile) -> str:
    """
    Uploads a video to Cloudflare R2 and returns the file key (filename).
    """
    client = get_r2_client()
    bucket_name = os.getenv('R2_BUCKET_NAME')
    public_url_base = os.getenv('R2_PUBLIC_URL')

    if not bucket_name or not public_url_base:
        raise ValueError("R2 environment variables are not configured properly.")

    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'mp4'
    unique_filename = f"{uuid.uuid4().hex}.{ext}"

    # Upload
    client.upload_fileobj(
        file.file,
        bucket_name,
        unique_filename,
        ExtraArgs={"ContentType": file.content_type or "video/mp4"}
    )

    # Return file key instead of public URL
    return unique_filename

def generate_signed_url(file_key: str) -> str:
    """
    Generates a presigned URL for secure frontend streaming
    """
    client = get_r2_client()
    bucket_name = os.getenv('R2_BUCKET_NAME')
    
    if not bucket_name:
        raise ValueError("R2_BUCKET_NAME is not configured properly.")

    try:
        url = client.generate_presigned_url(
            ClientMethod='get_object',
            Params={
                'Bucket': bucket_name,
                'Key': file_key
            },
            ExpiresIn=3600  # 1 hour expiry
        )
        return url
    except Exception as e:
        print(f"Error generating presigned URL: {str(e)}")
        raise e
