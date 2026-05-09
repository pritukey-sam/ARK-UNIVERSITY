import sqlite3
import os

db_path = 'lumina.db' # Assuming sqlite based on context
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN last_login_at DATETIME")
        print("Added last_login_at to users table")
    except Exception as e:
        print(f"Error or already exists: {e}")
    
    conn.commit()
    conn.close()
else:
    print("Database not found at expected path")
