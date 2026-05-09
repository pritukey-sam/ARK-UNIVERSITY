import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def check_db():
    DATABASE_URL = os.getenv("DATABASE_URL")
    print(f"Checking PostgreSQL database...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        tables = ['courses', 'users', 'enrollments']
        for table in tables:
            print(f"\nColumns in '{table}' table:")
            cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}'")
            columns = cur.fetchall()
            for col in columns:
                print(f"- {col[0]} ({col[1]})")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db()
