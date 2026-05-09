import os
import json
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def migrate_data():
    with engine.connect() as conn:
        print("Migrating question options...")
        # Get all questions that have option_1 but no options
        result = conn.execute(text("SELECT id, option_1, option_2, option_3, option_4 FROM questions WHERE options IS NULL AND option_1 IS NOT NULL"))
        questions = result.fetchall()
        
        count = 0
        for q in questions:
            opts = [q.option_1, q.option_2, q.option_3, q.option_4]
            # Filter out empty options if any
            opts = [o for o in opts if o]
            options_json = json.dumps(opts)
            
            conn.execute(
                text("UPDATE questions SET options = :opts, type = 'mcq' WHERE id = :id"),
                {"opts": options_json, "id": q.id}
            )
            count += 1
        
        conn.commit()
        print(f"Successfully migrated {count} questions.")

if __name__ == "__main__":
    migrate_data()
