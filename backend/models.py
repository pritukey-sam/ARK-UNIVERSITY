from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    plan_type = Column(String(20), default="free")  # free, paid
    status = Column(String(20), default="active")  # active, pending, rejected
    plan_price = Column(Float, default=0.0)
    company_code = Column(String(10), unique=True, index=True)  # e.g., ARK
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_suspended = Column(Boolean, default=False)
    payment_status = Column(String(20), default="pending") # pending, completed
    is_paid = Column(Boolean, default=False)
    expiry_date = Column(DateTime(timezone=True), nullable=True)

    users = relationship("User", back_populates="company")
    courses = relationship("Course", back_populates="company")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="employee")  # super_admin, admin, hr, employee
    employee_id = Column(String(50), nullable=True)  # ARK-E001
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    avatar_initials = Column(String(5), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    department = Column(String(100), nullable=True)
    designation = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    country_code = Column(String(10), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    is_first_login = Column(Boolean, default=True)
    temp_password = Column(String(255), nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company", back_populates="users")
    enrollments = relationship("Enrollment", back_populates="user", cascade="all, delete-orphan")
    progress_records = relationship("UserProgress", back_populates="user", cascade="all, delete-orphan")
    video_progress_records = relationship("UserVideoProgress", back_populates="user", cascade="all, delete-orphan")
    created_courses = relationship("Course", back_populates="creator")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    curator_name = Column(String(100), nullable=False, default="System Admin")
    curator_initials = Column(String(5), nullable=False, default="SA")
    course_number = Column(String(10), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completion_duration_days = Column(Integer, nullable=True)  # Standard corporate training duration

    company = relationship("Company", back_populates="courses")
    modules = relationship("Module", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    creator = relationship("User", back_populates="created_courses")


class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, default=0)
    order_index = Column(Integer, default=0)
    order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    course = relationship("Course", back_populates="modules")
    progress_records = relationship("UserProgress", back_populates="module", cascade="all, delete-orphan")
    videos = relationship("Video", order_by="Video.id", back_populates="module", cascade="all, delete-orphan")
    notes = relationship("Notes", back_populates="module", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="module", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="module", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="module", cascade="all, delete-orphan")


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    title = Column(String(255), nullable=False)
    video_url = Column(String(500), nullable=False)
    duration_seconds = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    module = relationship("Module", back_populates="videos")
    progress_records = relationship("UserVideoProgress", back_populates="video", cascade="all, delete-orphan")


class Notes(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(50), default="pdf")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    module = relationship("Module", back_populates="notes")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    title = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    module = relationship("Module", back_populates="assignments")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    title = Column(String(255), nullable=False)
    time_limit = Column(Integer, default=20)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    module = relationship("Module", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    type = Column(String(20), default="mcq")  # mcq, fill, short, code
    question_text = Column(Text, nullable=False)
    options = Column(Text, nullable=True)  # Store options as a JSON string
    correct_answer = Column(Text, nullable=False) # Store correct answer (index, text, or output)
    marks = Column(Integer, default=1)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    quiz = relationship("Quiz", back_populates="questions")
    user_answers = relationship("UserAnswer", back_populates="question", cascade="all, delete-orphan")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    score = Column(Float, default=0.0)
    total_marks = Column(Integer, default=0)
    percentage = Column(Float, default=0.0)
    status = Column(String(20), default="FAILED") # PASSED, FAILED
    attempt_number = Column(Integer, default=1)
    answers = Column(Text, nullable=True) # JSON string of user answers
    time_taken = Column(Integer, default=0) # In seconds
    attempted_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")
    quiz = relationship("Quiz", back_populates="attempts")
    user_answers = relationship("UserAnswer", back_populates="attempt", cascade="all, delete-orphan")


class UserAnswer(Base):
    __tablename__ = "user_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, default=False)
    marks_earned = Column(Integer, default=0)

    attempt = relationship("QuizAttempt", back_populates="user_answers")
    question = relationship("Question", back_populates="user_answers")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    file_url = Column(String(500), nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")
    module = relationship("Module", back_populates="submissions")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    last_reminder_sent_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")


class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    is_completed = Column(Boolean, default=False)
    video_watched = Column(Boolean, default=False)
    notes_viewed = Column(Boolean, default=False)
    assignment_submitted = Column(Boolean, default=False)
    quiz_completed = Column(Boolean, default=False)
    last_video_timestamp = Column(Float, default=0.0)
    last_tab = Column(String(50), default="video")
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="progress_records")
    module = relationship("Module", back_populates="progress_records")


class UserVideoProgress(Base):
    __tablename__ = "user_video_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    watched_seconds = Column(Float, default=0.0)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="video_progress_records")
    video = relationship("Video", back_populates="progress_records")


class AssignmentRequest(Base):
    __tablename__ = "assignment_requests"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    hr_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    status = Column(String(50), default="pending")  # pending, approved, rejected, cancelled
    requested_due_date = Column(DateTime(timezone=True), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True) # Finalized due date
    note = Column(Text, nullable=True)
    reason = Column(Text, nullable=True) # Rejection reason or approval notes
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)

    admin = relationship("User", foreign_keys=[admin_id])
    hr = relationship("User", foreign_keys=[hr_id])
    user = relationship("User", foreign_keys=[user_id])
    course = relationship("Course")

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(255), nullable=False)
    details = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")
    company = relationship("Company")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), nullable=True)
    route = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


    user = relationship("User")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    actor_name = Column(String(100), nullable=True)
    actor_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False)
    target = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)

    company = relationship("Company")


class CourseAccessRequest(Base):
    __tablename__ = "course_access_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    status = Column(String(50), default="pending")  # pending, approved, rejected, fulfilled
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    course = relationship("Course")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    __table_args__ = (
        UniqueConstraint('user_id', 'course_id', name='uq_user_course_request'),
    )

