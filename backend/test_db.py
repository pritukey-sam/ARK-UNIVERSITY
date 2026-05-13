import sys
import os
sys.path.append(os.getcwd())
from database import SessionLocal, engine
from models import AssignmentRequest
from datetime import datetime, timezone

db = SessionLocal()
try:
    # Try to query the table to see if columns exist
    r = db.query(AssignmentRequest).first()
    print("Query successful")
    
    # Try to create an object in memory
    new_r = AssignmentRequest(
        hr_id=1,
        user_id=1,
        course_id=1,
        status="pending"
    )
    print("Object creation successful")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
