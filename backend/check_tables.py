import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def check_tables():
    DATABASE_URL = os.getenv("DATABASE_URL")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('public', 'app_schema');")
        tables = cur.fetchall()
        print("Existing tables:")
        for t in tables:
            print(f"- {t[0]}.{t[1]}")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_tables()
