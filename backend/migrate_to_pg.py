import sqlite3
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, Course, Module, Enrollment, UserProgress, Video, Notes, Assignment, Quiz, Question, QuizAttempt, Submission
from dotenv import load_dotenv

load_dotenv()

SQLITE_DB = "lumina_lms.db"
POSTGRES_URL = os.getenv("DATABASE_URL")

def migrate():
    if not os.path.exists(SQLITE_DB):
        print(f"No SQLite database found at {SQLITE_DB}")
        return

    # Connect to databases
    lite_conn = sqlite3.connect(SQLITE_DB)
    lite_conn.row_factory = sqlite3.Row
    lite_cur = lite_conn.cursor()

    pg_engine = create_engine(POSTGRES_URL)
    Session = sessionmaker(bind=pg_engine)
    pg_session = Session()

    # Create tables in Postgres
    Base.metadata.create_all(pg_engine)

    print("Starting migration...")

    # 1. Users
    lite_cur.execute("SELECT * FROM users")
    for row in lite_cur.fetchall():
        user = User(
            id=row['id'],
            name=row['name'],
            email=row['email'],
            password_hash=row['password_hash'],
            role=row['role'],
            avatar_initials=row['avatar_initials'],
            created_at=row['created_at']
        )
        pg_session.merge(user)
    print("Migrated users")

    # 2. Courses
    lite_cur.execute("SELECT * FROM courses")
    for row in lite_cur.fetchall():
        course = Course(
            id=row['id'],
            title=row['title'],
            description=row['description'],
            curator_name=row['curator_name'],
            curator_initials=row['curator_initials'],
            course_number=row['course_number'],
            created_by=row['created_by'],
            is_active=row['is_active'],
            created_at=row['created_at']
        )
        pg_session.merge(course)
    print("Migrated courses")

    # 3. Modules
    lite_cur.execute("SELECT * FROM modules")
    for row in lite_cur.fetchall():
        module = Module(
            id=row['id'],
            course_id=row['course_id'],
            title=row['title'],
            description=row['description'],
            duration_minutes=row['duration_minutes'],
            order_index=row['order_index'],
            order=row['order'],
            is_active=row['is_active'],
            created_at=row['created_at']
        )
        pg_session.merge(module)
    print("Migrated modules")

    # 4. Enrollments
    lite_cur.execute("SELECT * FROM enrollments")
    for row in lite_cur.fetchall():
        enrollment = Enrollment(
            id=row['id'],
            user_id=row['user_id'],
            course_id=row['course_id'],
            enrolled_at=row['enrolled_at'],
            is_active=row['is_active']
        )
        pg_session.merge(enrollment)
    print("Migrated enrollments")

    # 5. UserProgress
    lite_cur.execute("SELECT * FROM user_progress")
    for row in lite_cur.fetchall():
        progress = UserProgress(
            id=row['id'],
            user_id=row['user_id'],
            module_id=row['module_id'],
            course_id=row['course_id'],
            is_completed=row['is_completed'],
            completed_at=row['completed_at'],
            created_at=row['created_at']
        )
        pg_session.merge(progress)
    print("Migrated user progress")

    # 6. Content (Videos, Notes, Assignments)
    lite_cur.execute("SELECT * FROM videos")
    for row in lite_cur.fetchall():
        pg_session.merge(Video(id=row['id'], module_id=row['module_id'], title=row['title'], video_url=row['video_url']))
    
    lite_cur.execute("SELECT * FROM notes")
    for row in lite_cur.fetchall():
        pg_session.merge(Notes(id=row['id'], module_id=row['module_id'], file_url=row['file_url'], file_type=row['file_type']))

    lite_cur.execute("SELECT * FROM assignments")
    for row in lite_cur.fetchall():
        pg_session.merge(Assignment(id=row['id'], module_id=row['module_id'], title=row['title'], file_url=row['file_url']))

    # 7. Quizzes
    lite_cur.execute("SELECT * FROM quizzes")
    for row in lite_cur.fetchall():
        pg_session.merge(Quiz(id=row['id'], module_id=row['module_id'], title=row['title']))

    lite_cur.execute("SELECT * FROM questions")
    for row in lite_cur.fetchall():
        pg_session.merge(Question(
            id=row['id'], 
            quiz_id=row['quiz_id'], 
            question_text=row['question_text'],
            option_1=row['option_1'],
            option_2=row['option_2'],
            option_3=row['option_3'],
            option_4=row['option_4'],
            correct_answer=row['correct_answer']
        ))

    lite_cur.execute("SELECT * FROM quiz_attempts")
    for row in lite_cur.fetchall():
        pg_session.merge(QuizAttempt(id=row['id'], user_id=row['user_id'], quiz_id=row['quiz_id'], score=row['score'], attempted_at=row['attempted_at']))

    # 8. Submissions
    lite_cur.execute("SELECT * FROM submissions")
    for row in lite_cur.fetchall():
        pg_session.merge(Submission(id=row['id'], user_id=row['user_id'], module_id=row['module_id'], file_url=row['file_url'], submitted_at=row['submitted_at']))

    pg_session.commit()
    print("Migration completed successfully!")

    pg_session.close()
    lite_conn.close()

if __name__ == "__main__":
    migrate()
