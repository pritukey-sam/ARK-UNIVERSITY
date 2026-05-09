from database import engine
from sqlalchemy import text

def migrate():
    try:
        with engine.connect() as conn:
            print("Connected to database...")
            # Make legacy option columns nullable to support new JSON structure
            conn.execute(text("ALTER TABLE questions ALTER COLUMN option_1 DROP NOT NULL"))
            conn.execute(text("ALTER TABLE questions ALTER COLUMN option_2 DROP NOT NULL"))
            conn.execute(text("ALTER TABLE questions ALTER COLUMN option_3 DROP NOT NULL"))
            conn.execute(text("ALTER TABLE questions ALTER COLUMN option_4 DROP NOT NULL"))
            conn.commit()
            print("Successfully made legacy option columns nullable")
    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
