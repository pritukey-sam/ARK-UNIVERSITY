import os
import shutil
from datetime import datetime

UPLOAD_DIR = "uploads"

# Ensure upload directory exists
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

def save_file_locally(file_obj, folder="general"):
    """
    Saves an uploaded file locally and returns the access URL.
    """
    try:
        # Create folder-specific path
        target_dir = os.path.join(UPLOAD_DIR, folder)
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)
            
        # Create a unique filename using timestamp
        original_filename = getattr(file_obj, 'filename', "file")
        timestamp = int(datetime.now().timestamp())
        unique_filename = f"{timestamp}_{original_filename}"
        
        file_path = os.path.join(target_dir, unique_filename)
        
        # Save the file
        if hasattr(file_obj, 'file'):
            file_obj.file.seek(0)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file_obj.file, buffer)
        elif hasattr(file_obj, 'seek'):
            file_obj.seek(0)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file_obj, buffer)
        else:
            # Assume it's a path if it's a string
            shutil.copy(file_obj, file_path)
            
        # Return the local URL
        # We use relative paths for the DB, or full URLs if preferred. 
        # The user requested full URLs: http://localhost:8000/uploads/...
        return f"http://localhost:8000/uploads/{folder}/{unique_filename}"
        
    except Exception as e:
        print(f"Error saving file locally: {e}")
        return None

def delete_local_file(file_url):
    """
    Deletes a file from the local storage based on its URL.
    """
    try:
        if not file_url:
            return False
            
        # Extract the relative path from the URL
        # http://localhost:8000/uploads/folder/filename -> uploads/folder/filename
        if "http://localhost:8000/uploads/" in file_url:
            relative_path = file_url.replace("http://localhost:8000/", "")
            if os.path.exists(relative_path):
                os.remove(relative_path)
                return True
        return False
    except Exception as e:
        print(f"Error deleting local file: {e}")
        return False
