from fastapi import FastAPI, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from database import create_tables
from routers import courses, progress, assignments, super_admin, dashboard, user, registration, payment, upload, notifications
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
    title="Lumina LMS API",
    description="Backend API for Lumina Learning Management System",
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

# Serve uploaded files locally
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", CustomStaticFiles(directory="uploads"), name="uploads")

# ── STARTUP ────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    print("Lumina LMS API started - User router included")
    create_tables()
    print("Lumina LMS API started - tables checked")

# ── HEALTH CHECK ───────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "app": "Lumina LMS API v2.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}
