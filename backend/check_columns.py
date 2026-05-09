import sqlite3
import os

def check_db():
    db_path = "lumina_lms.db"
    if not os.path.exists(db_path):
        db_path = "lms.db"
    
    print(f"Checking database: {db_path}")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    tables = ['courses', 'users', 'enrollments']
    for table in tables:
        print(f"\nColumns in '{table}' table:")
        cur.execute(f"PRAGMA table_info({table})")
        columns = cur.fetchall()
        for col in columns:
            print(f"- {col[1]} ({col[2]})")
    conn.close()

if __name__ == "__main__":
    check_db()
