import os
import boto3
from dotenv import load_dotenv

def get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=os.getenv('R2_ENDPOINT'),
        aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
        region_name='auto'
    )

if __name__ == "__main__":
    load_dotenv()
    
    bucket = os.getenv('R2_BUCKET_NAME')
    client = get_r2_client()
    
    cors_configuration = {
        'CORSRules': [{
            'AllowedHeaders': ['*'],
            'AllowedMethods': ['GET'],
            'AllowedOrigins': ['*'],
            'ExposeHeaders': []
        }]
    }
    
    print(f"Setting CORS for bucket: {bucket}")
    try:
        client.put_bucket_cors(Bucket=bucket, CORSConfiguration=cors_configuration)
        print("CORS successfully applied. Video streaming from frontend will now work.")
    except Exception as e:
        print(f"Error setting CORS: {e}")
