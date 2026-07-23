from fastapi import FastAPI, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from database import create_tables
from routers import courses, progress, assignments, super_admin, dashboard, user, registration, payment, upload, notifications, course_access
import routes
import ai_routes

class CustomStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope) -> Response:
        response = await super().get_response(path, scope)
        if "assignments" in path:
            query_string = scope.get("query_string", b"")
            if b"download" in query_string:
                filename = os.path.basename(path)
                response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
                response.headers["Access-Control-Allow-Origin"] = "*"
        return response

app = FastAPI(
    title="ARK University LMS API",
    description="Backend API for ARK University Learning Management System",
    version="2.0.0"
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Next.js dev
        "http://localhost:3001",
        "https://yourdomain.com"   # production — change this
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── SECURITY HEADERS ───────────────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request, call_next):
    host = request.url.hostname or ""
    is_development = (
        os.getenv("ENV", "development").lower() == "development" or
        host == "localhost" or
        host == "127.0.0.1" or
        host.startswith("192.168.") or
        host.startswith("10.")
    )
    
    response = await call_next(request)
    
    # 1. Clickjacking prevention
    response.headers["X-Frame-Options"] = "DENY"
    
    # 2. MIME sniffing prevention
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # 3. Referrer Policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # 4. Content Security Policy
    if is_development:
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://player.vimeo.com https://f.vimeocdn.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: https://pub-15434e9e4db6402892098a597dc510ea.r2.dev; "
            "media-src 'self' blob: https://pub-15434e9e4db6402892098a597dc510ea.r2.dev; "
            "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://vimeo.com; "
            "connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https://fonts.googleapis.com; "
            "object-src 'none'; "
            "frame-ancestors 'none';"
        )
    else:
        csp = (
            "default-src 'self'; "
            "script-src 'self' https://www.youtube.com https://s.ytimg.com https://player.vimeo.com https://f.vimeocdn.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: https://pub-15434e9e4db6402892098a597dc510ea.r2.dev; "
            "media-src 'self' blob: https://pub-15434e9e4db6402892098a597dc510ea.r2.dev; "
            "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://vimeo.com; "
            "connect-src 'self' https://fonts.googleapis.com; "
            "object-src 'none'; "
            "frame-ancestors 'none';"
        )
    response.headers["Content-Security-Policy"] = csp
    
    # 5. Permissions Policy
    response.headers["Permissions-Policy"] = (
        "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()"
    )
    
    return response

# ── STATIC FILES ───────────────────────────────────────────────────────────
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", CustomStaticFiles(directory="uploads"), name="uploads")

# ── ROUTES ─────────────────────────────────────────────────────────────────
app.include_router(registration.router, prefix="/api")
app.include_router(courses.router, prefix="/api")
app.include_router(progress.router, prefix="/api")
app.include_router(assignments.router, prefix="/api")
app.include_router(super_admin.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(payment.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(routes.router, prefix="/api")
app.include_router(ai_routes.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(course_access.router, prefix="/api")

# Serve uploaded files locally
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", CustomStaticFiles(directory="uploads"), name="uploads")

# ── STARTUP ────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    print("ARK University LMS API started - User router included")
    from services.email_service import verify_and_log_smtp_config
    verify_and_log_smtp_config()
    create_tables()
    print("ARK University LMS API started - tables checked")

# ── HEALTH CHECK ───────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "app": "ARK University LMS API v2.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}
