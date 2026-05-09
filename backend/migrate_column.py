from database import engine
from sqlalchemy import text

def migrate():
    try:
        with engine.connect() as conn:
            print("Connected to database...")
            # PostgreSQL syntax to alter column type
            conn.execute(text("ALTER TABLE questions ALTER COLUMN correct_answer TYPE TEXT"))
            conn.commit()
            print("Successfully altered correct_answer to TEXT")
    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
