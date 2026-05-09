from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── MODULE SCHEMAS ─────────────────────────────────────────────────────────

class ModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    duration_minutes: int = 0
    order_index: int = 0


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None


class ModuleCreate(ModuleBase):
    course_id: int


class ModuleOut(ModuleBase):
    id: int
    course_id: int
    is_completed: bool = False
    video_count: int = 0
    note_count: int = 0
    quiz_count: int = 0
    assignment_count: int = 0
    duration_seconds: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── CONTENT SCHEMAS ────────────────────────────────────────────────────────

class VideoCreate(BaseModel):
    title: str
    video_url: str
    duration_seconds: int = 0

class VideoOut(VideoCreate):
    id: int
    module_id: int
    duration_seconds: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class QuestionCreate(BaseModel):
    type: str = "mcq"  # mcq, fill, short, code
    question_text: str
    options: Optional[str] = None  # JSON string for MCQ options
    correct_answer: str
    marks: int = 1
    explanation: Optional[str] = None

class QuestionOut(QuestionCreate):
    id: int
    quiz_id: int

    class Config:
        from_attributes = True

class QuizCreate(BaseModel):
    title: str
    questions: List[QuestionCreate]

class QuizOut(BaseModel):
    id: int
    module_id: int
    title: str
    questions: List[QuestionOut]
    created_at: datetime

    class Config:
        from_attributes = True

class QuizAnswer(BaseModel):
    question_id: int
    answer: str

class QuizAttemptCreate(BaseModel):
    answers: List[QuizAnswer]
    time_taken: int  # seconds

class QuizAttemptOut(BaseModel):
    id: int
    score: float
    total_marks: int
    percentage: float
    status: str
    attempt_number: int
    attempted_at: datetime

    class Config:
        from_attributes = True


# ── COURSE SCHEMAS ─────────────────────────────────────────────────────────

class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    curator_name: str = "System Admin"
    curator_initials: str = "SA"
    course_number: Optional[str] = None
    completion_duration_days: Optional[int] = None


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    curator_name: Optional[str] = None
    is_active: Optional[bool] = None
    completion_duration_days: Optional[int] = None


class CourseProgress(BaseModel):
    progress_percent: int
    completed_modules: int
    total_modules: int
    status: str  # "completed" | "in_progress" | "not_started"


class CourseOut(CourseBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    progress: Optional[CourseProgress] = None
    is_enrolled: bool = False
    total_duration_seconds: int = 0
    completion_duration_days: Optional[int] = None
    due_date: Optional[datetime] = None
    is_overdue: bool = False
    assigned_at: Optional[datetime] = None
    resume_module_id: Optional[int] = None
    modules: List[ModuleOut] = []

    class Config:
        from_attributes = True


class CourseListOut(CourseBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    progress: Optional[CourseProgress] = None
    is_enrolled: bool = False
    total_modules: int = 0
    total_duration_seconds: int = 0
    completion_duration_days: Optional[int] = None
    due_date: Optional[datetime] = None
    is_overdue: bool = False
    assigned_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── ENROLLMENT SCHEMAS ─────────────────────────────────────────────────────

class EnrollmentCreate(BaseModel):
    course_id: int


class EnrollmentOut(BaseModel):
    id: int
    user_id: int
    course_id: int
    enrolled_at: datetime

    class Config:
        from_attributes = True


# ── PROGRESS SCHEMAS ───────────────────────────────────────────────────────

class MarkModuleComplete(BaseModel):
    module_id: int
    course_id: int


class ProgressOut(BaseModel):
    module_id: int
    course_id: int
    is_completed: bool
    video_watched: bool = False
    notes_viewed: bool = False
    assignment_submitted: bool = False
    quiz_completed: bool = False
    last_video_timestamp: float = 0.0
    last_tab: str = "video"
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserVideoProgressOut(BaseModel):
    video_id: int
    watched_seconds: float
    is_completed: bool
    duration_seconds: int

class ModuleProgressDetail(BaseModel):
    module_id: int
    progress_percent: int
    video_completed: bool
    notes_completed: bool
    assignment_submitted: bool
    quiz_completed: bool
    last_video_timestamp: float
    last_tab: str
    quiz_unlocked: bool = False
    videos: List[UserVideoProgressOut] = []

class VideoProgressUpdate(BaseModel):
    video_id: int
    watched_seconds: float


class ModuleProgressUpdate(BaseModel):
    course_id: int
    module_id: int
    video_watched: Optional[bool] = None
    notes_viewed: Optional[bool] = None
    assignment_submitted: Optional[bool] = None
    quiz_completed: Optional[bool] = None
    last_video_timestamp: Optional[float] = None
    last_tab: Optional[str] = None


# ── STATS SCHEMA ───────────────────────────────────────────────────────────

class CourseStatsOut(BaseModel):
    total_courses: int
    enrolled_courses: int
    completed_courses: int
    in_progress_courses: int
    not_started_courses: int


# ── COMPANY SCHEMAS ────────────────────────────────────────────────────────
class CompanyBase(BaseModel):
    name: str
    plan_type: str = "free"
    plan_price: float = 0.0
    company_code: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    plan_type: Optional[str] = None
    plan_price: Optional[float] = None
    company_code: Optional[str] = None
    is_suspended: Optional[bool] = None
    expiry_date: Optional[datetime] = None

class CompanyOut(CompanyBase):
    id: int
    created_at: datetime
    is_suspended: bool = False
    payment_status: str = "pending"
    is_paid: bool = False
    expiry_date: Optional[datetime] = None
    employee_count: Optional[int] = 0

    class Config:
        from_attributes = True

class CompanyWithAdminCreate(CompanyCreate):
    admin_name: str
    admin_email: str
    admin_password: str

class RegistrationApproval(BaseModel):
    plan_type: str
    plan_price: float = 0.0


# ── USER SCHEMAS ───────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    avatar_initials: Optional[str]
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    employee_id: Optional[str] = None
    plan_type: Optional[str] = "free"
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    company_code: Optional[str] = None

    class Config:
        from_attributes = True


# ── ASSIGNMENT REQUEST SCHEMAS ──────────────────────────────────────────────
class AssignmentRequestCreate(BaseModel):
    user_id: int
    course_id: int
    hr_id: int
    requested_due_date: Optional[datetime] = None
    note: Optional[str] = None

class AssignmentRequestOut(BaseModel):
    id: int
    admin_id: int
    hr_id: int
    user_id: int
    course_id: int
    status: str
    requested_due_date: Optional[datetime] = None
    note: Optional[str] = None
    created_at: datetime
    
    # Optional fields for UI convenience
    admin_name: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    course_title: Optional[str] = None

    class Config:
        from_attributes = True