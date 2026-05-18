from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL must be set in .env")

# PostgreSQL connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    connect_args={"options": "-c search_path=app_schema,public"}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for FastAPI to get a database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Auto-create tables based on models"""
    try:
        from models import (User, Course, Module, Enrollment, UserProgress,
                            Video, Notes, Assignment, Quiz, Question,
                            QuizAttempt, Submission, UserVideoProgress, AssignmentRequest, ActivityLog, Notification)
        Base.metadata.create_all(bind=engine)
        
        # Manual migration for duration_seconds
        from sqlalchemy import text, inspect
        inspector = inspect(engine)
        
        # Course thumbnail column
        course_columns = [c['name'] for c in inspector.get_columns('courses')]
        if 'thumbnail_url' not in course_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE courses ADD COLUMN thumbnail_url VARCHAR(500)"))
                conn.commit()
            print("Added thumbnail_url column to courses table")

        # Video duration column
        columns = [c['name'] for c in inspector.get_columns('videos')]
        if 'duration_seconds' not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE videos ADD COLUMN duration_seconds INTEGER DEFAULT 0"))
                conn.commit()
            print("Added duration_seconds column to videos table")

        if 'description' not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE videos ADD COLUMN description TEXT"))
                conn.commit()
            print("Added description column to videos table")

        # User avatar column
        user_columns = [c['name'] for c in inspector.get_columns('users')]
        if 'avatar_url' not in user_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)"))
                conn.commit()
            print("Added avatar_url column to users table")
        
        if 'created_at' not in user_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"))
                conn.commit()
            print("Added created_at column to users table")

        if 'updated_at' not in user_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"))
                conn.commit()
            print("Added updated_at column to users table")

        if 'last_login_at' not in user_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE"))
                conn.commit()
            print("Added last_login_at column to users table")

        if 'is_active' not in user_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
                conn.commit()
            print("Added is_active column to users table")

        if 'department' not in user_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR(100)"))
                conn.commit()
            print("Added department column to users table")

        if 'phone' not in user_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(20)"))
                conn.commit()
            print("Added phone column to users table")

        if 'country_code' not in user_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN country_code VARCHAR(10)"))
                conn.commit()
            print("Added country_code column to users table")

        # Company SaaS columns
        company_columns = [c['name'] for c in inspector.get_columns('companies')]
        if 'is_suspended' not in company_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE companies ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE"))
                conn.commit()
            print("Added is_suspended column to companies table")
            
        if 'expiry_date' not in company_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE companies ADD COLUMN expiry_date TIMESTAMP WITH TIME ZONE"))
                conn.commit()
            print("Added expiry_date column to companies table")

        if 'status' not in company_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE companies ADD COLUMN status VARCHAR(20) DEFAULT 'active'"))
                conn.commit()
            print("Added status column to companies table")

        if 'payment_status' not in company_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE companies ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending'"))
                conn.execute(text("ALTER TABLE companies ADD COLUMN is_paid BOOLEAN DEFAULT FALSE"))
                conn.commit()
            print("Added payment columns to companies table")

        # Enrollment columns
        enrollment_columns = [c['name'] for c in inspector.get_columns('enrollments')]
        if 'due_date' not in enrollment_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE enrollments ADD COLUMN due_date TIMESTAMP WITH TIME ZONE"))
                conn.commit()
            print("Added due_date column to enrollments table")
            
        if 'is_completed' not in enrollment_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE enrollments ADD COLUMN is_completed BOOLEAN DEFAULT FALSE"))
                conn.commit()
            print("Added is_completed column to enrollments table")
            
        if 'completed_at' not in enrollment_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE enrollments ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE"))
                conn.commit()
            print("Added completed_at column to enrollments table")
            
        if 'last_reminder_sent_at' not in enrollment_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE enrollments ADD COLUMN last_reminder_sent_at TIMESTAMP WITH TIME ZONE"))
                conn.commit()
            print("Added last_reminder_sent_at column to enrollments table")

        # UserProgress pillar columns migration
        up_columns = [c['name'] for c in inspector.get_columns('user_progress')]
        if 'video_watched' not in up_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE user_progress ADD COLUMN video_watched BOOLEAN DEFAULT FALSE"))
                conn.commit()
            print("Added video_watched to user_progress")
        if 'notes_viewed' not in up_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE user_progress ADD COLUMN notes_viewed BOOLEAN DEFAULT FALSE"))
                conn.commit()
            print("Added notes_viewed to user_progress")
        if 'assignment_submitted' not in up_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE user_progress ADD COLUMN assignment_submitted BOOLEAN DEFAULT FALSE"))
                conn.commit()
            print("Added assignment_submitted to user_progress")
        if 'quiz_completed' not in up_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE user_progress ADD COLUMN quiz_completed BOOLEAN DEFAULT FALSE"))
                conn.commit()
            print("Added quiz_completed to user_progress")
        if 'last_video_timestamp' not in up_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE user_progress ADD COLUMN last_video_timestamp FLOAT DEFAULT 0.0"))
                conn.commit()
            print("Added last_video_timestamp to user_progress")
        if 'last_tab' not in up_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE user_progress ADD COLUMN last_tab VARCHAR(50) DEFAULT 'video'"))
                conn.commit()
            print("Added last_tab to user_progress")

        # Course columns
        courses_columns = [c['name'] for c in inspector.get_columns('courses')]
        if 'completion_duration_days' not in courses_columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE courses ADD COLUMN completion_duration_days INTEGER DEFAULT 30"))
                conn.commit()
            print("Added completion_duration_days column to courses table")

        # AssignmentRequests columns
        if 'assignment_requests' in inspector.get_table_names():
            ar_columns = [c['name'] for c in inspector.get_columns('assignment_requests')]
            if 'requested_due_date' not in ar_columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE assignment_requests ADD COLUMN requested_due_date TIMESTAMP WITH TIME ZONE"))
                    conn.commit()
                print("Added requested_due_date column to assignment_requests table")
                
            if 'reason' not in ar_columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE assignment_requests ADD COLUMN reason TEXT"))
                    conn.commit()
                print("Added reason column to assignment_requests table")
                
            if 'due_date' not in ar_columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE assignment_requests ADD COLUMN due_date TIMESTAMP WITH TIME ZONE"))
                    conn.commit()
                print("Added due_date column to assignment_requests table")
            
            if 'approved_at' not in ar_columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE assignment_requests ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE"))
                    conn.commit()
                print("Added approved_at column to assignment_requests table")

            # SAFETY: Ensure admin_id is nullable (fix for NotNullViolation)
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE assignment_requests ALTER COLUMN admin_id DROP NOT NULL"))
                conn.commit()
                print("Ensured admin_id is nullable in assignment_requests table")

        print("Database tables verified/created")
    except Exception as e:
        print(f"Warning: Could not verify/create tables: {e}")
        print("Continuing startup... (assuming tables already exist)")