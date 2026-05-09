import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def migrate_quiz_attempts():
    with engine.connect() as conn:
        print("Migrating 'quiz_attempts' table...")
        try:
            conn.execute(text("ALTER TABLE quiz_attempts ADD COLUMN percentage FLOAT DEFAULT 0.0"))
            conn.execute(text("ALTER TABLE quiz_attempts ADD COLUMN status VARCHAR(20) DEFAULT 'FAILED'"))
            conn.execute(text("ALTER TABLE quiz_attempts ADD COLUMN attempt_number INTEGER DEFAULT 1"))
            print("Successfully updated 'quiz_attempts' table with pass/fail metrics.")
        except Exception as e:
            print(f"Error updating 'quiz_attempts': {e}")
        
        conn.commit()

if __name__ == "__main__":
    migrate_quiz_attempts()
