import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

columns = inspector.get_columns('questions')
print("Columns in 'questions' table:")
for column in columns:
    print(f"- {column['name']}")

columns_attempt = inspector.get_columns('quiz_attempts')
print("\nColumns in 'quiz_attempts' table:")
for column in columns_attempt:
    print(f"- {column['name']}")
