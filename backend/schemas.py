from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from validation import (
    validate_email,
    validate_name,
    validate_designation,
    validate_course_name,
    validate_description,
    validate_url,
    validate_video_url,
    validate_numeric_range
)


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

    @field_validator('title')
    @classmethod
    def validate_module_title(cls, v):
        if v is not None:
            validate_course_name(v)
        return v

    @field_validator('description')
    @classmethod
    def validate_module_desc(cls, v):
        if v is not None:
            validate_description(v)
        return v


class ModuleCreate(ModuleBase):
    course_id: int

    @field_validator('title')
    @classmethod
    def validate_module_title(cls, v):
        validate_course_name(v)
        return v

    @field_validator('description')
    @classmethod
    def validate_module_desc(cls, v):
        if v is not None:
            validate_description(v)
        return v


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

    @field_validator('title')
    @classmethod
    def validate_video_title(cls, v):
        validate_course_name(v)
        return v

    @field_validator('video_url')
    @classmethod
    def validate_vid_url(cls, v):
        validate_video_url(v)
        return v

    @field_validator('duration_seconds')
    @classmethod
    def validate_dur(cls, v):
        validate_numeric_range(v, 0, 86400, 'Duration')
        return v

class VideoOut(BaseModel):
    id: int
    module_id: int
    title: str
    video_url: str
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

    @field_validator('question_text')
    @classmethod
    def validate_question_txt(cls, v):
        validate_description(v, is_required=True)
        return v

    @field_validator('marks')
    @classmethod
    def validate_q_marks(cls, v):
        validate_numeric_range(v, 1, 100, 'Marks')
        return v

class QuestionOut(BaseModel):
    id: int
    quiz_id: int
    type: str = "mcq"  # mcq, fill, short, code
    question_text: str
    options: Optional[str] = None  # JSON string for MCQ options
    correct_answer: str
    marks: int = 1
    explanation: Optional[str] = None

    class Config:
        from_attributes = True

class QuizCreate(BaseModel):
    title: str
    questions: List[QuestionCreate]

    @field_validator('title')
    @classmethod
    def validate_quiz_title(cls, v):
        validate_course_name(v)
        return v

class QuizOut(BaseModel):
    id: int
    module_id: int
    title: str
    time_limit: Optional[int] = 20
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
    @field_validator('title')
    @classmethod
    def validate_course_title(cls, v):
        validate_course_name(v)
        return v

    @field_validator('description')
    @classmethod
    def validate_course_desc(cls, v):
        if v is not None:
            validate_description(v)
        return v

    @field_validator('thumbnail_url')
    @classmethod
    def validate_course_thumb(cls, v):
        if v:
            validate_url(v)
        return v

    @field_validator('completion_duration_days')
    @classmethod
    def validate_duration(cls, v):
        if v is not None:
            validate_numeric_range(v, 1, 365, 'Completion duration')
        return v


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    curator_name: Optional[str] = None
    is_active: Optional[bool] = None
    completion_duration_days: Optional[int] = None

    @field_validator('title')
    @classmethod
    def validate_course_title(cls, v):
        if v is not None:
            validate_course_name(v)
        return v

    @field_validator('description')
    @classmethod
    def validate_course_desc(cls, v):
        if v is not None:
            validate_description(v)
        return v

    @field_validator('thumbnail_url')
    @classmethod
    def validate_course_thumb(cls, v):
        if v:
            validate_url(v)
        return v

    @field_validator('completion_duration_days')
    @classmethod
    def validate_duration(cls, v):
        if v is not None:
            validate_numeric_range(v, 1, 365, 'Completion duration')
        return v


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
    access_request_status: Optional[str] = None

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
    access_request_status: Optional[str] = None

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
    overall_progress: int
    video_completed: bool
    notes_completed: bool
    assignment_completed: bool
    quiz_completed: bool
    last_video_timestamp: float = 0.0
    last_tab: str = "video"
    quiz_unlocked: bool = False
    videos: List[UserVideoProgressOut] = []

class VideoProgressUpdate(BaseModel):
    video_id: int
    watched_seconds: float = 0.0
    completed: bool = False
    module_id: Optional[int] = None

class NotesProgressUpdate(BaseModel):
    module_id: int
    completed: bool


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
    @field_validator('name')
    @classmethod
    def validate_company_name(cls, v):
        validate_course_name(v)
        return v

    @field_validator('plan_price')
    @classmethod
    def validate_price(cls, v):
        validate_numeric_range(v, 0, 1000000, 'Price')
        return v

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    plan_type: Optional[str] = None
    plan_price: Optional[float] = None
    company_code: Optional[str] = None
    is_suspended: Optional[bool] = None
    expiry_date: Optional[datetime] = None

    @field_validator('name')
    @classmethod
    def validate_company_name(cls, v):
        if v is not None:
            validate_course_name(v)
        return v

    @field_validator('plan_price')
    @classmethod
    def validate_price(cls, v):
        if v is not None:
            validate_numeric_range(v, 0, 1000000, 'Price')
        return v

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

    @field_validator('admin_name')
    @classmethod
    def validate_adm_name(cls, v):
        validate_name(v)
        return v

    @field_validator('admin_email')
    @classmethod
    def validate_adm_email(cls, v):
        validate_email(v)
        return v

    @field_validator('admin_password')
    @classmethod
    def validate_adm_password(cls, v):
        if not v:
            raise ValueError("Password is required")
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

class RegistrationApproval(BaseModel):
    plan_type: str
    plan_price: float = 0.0

    @field_validator('plan_price')
    @classmethod
    def validate_price(cls, v):
        validate_numeric_range(v, 0, 1000000, 'Price')
        return v


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
    designation: Optional[str] = None
    plan_type: Optional[str] = "free"
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None
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
    admin_id: Optional[int] = None
    hr_id: int
    user_id: int
    course_id: int
    status: str
    requested_due_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    note: Optional[str] = None
    reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    
    # Optional fields for UI convenience
    admin_name: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    course_title: Optional[str] = None
    hr_name: Optional[str] = None
    progress_percent: Optional[int] = None
    approval_timestamp: Optional[datetime] = None
    completion_duration_days: Optional[int] = None
    employee_id: Optional[str] = None
    request_type: Optional[str] = None
    requested_by: Optional[str] = None

    class Config:
        from_attributes = True

class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: Optional[str] = None
    route: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationCount(BaseModel):
    unread_count: int

class CompanyWithAdminCreateOut(BaseModel):
    message: str
    company: CompanyOut
    admin: UserOut

class CourseAccessRequestCreate(BaseModel):
    course_id: int

class CourseAccessRequestOut(BaseModel):
    id: int
    user_id: int
    course_id: int
    status: str
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Extra fields for UI convenience
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    course_title: Optional[str] = None
    reviewer_name: Optional[str] = None
    employee_id: Optional[str] = None

    class Config:
        from_attributes = True