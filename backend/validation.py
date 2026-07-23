import re

def validate_email(email: str) -> None:
    if not email:
        raise ValueError("Email address is required")
    trimmed = email.strip()
    if re.search(r'\s', trimmed):
        raise ValueError("Email must not contain spaces")
    pattern = r'^[a-zA-Z0-9._%-]+(?:\+[a-zA-Z0-9._%-]+)?@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, trimmed):
        raise ValueError("Invalid email address format")

def validate_name(name: str) -> None:
    if not name or not name.strip():
        raise ValueError("Name cannot be empty or whitespace-only")
    trimmed = name.strip()
    if len(trimmed) < 2:
        raise ValueError("Name must be at least 2 characters long")
    if any(c.isdigit() for c in trimmed):
        raise ValueError("Name must not contain numbers")
    if not re.match(r'^[a-zA-Z\s\'\-]+$', trimmed):
        raise ValueError("Name can only contain letters, spaces, hyphens, and apostrophes")
    if not any(c.isalpha() for c in trimmed):
        raise ValueError("Name must contain at least one letter")

def validate_designation(designation: str) -> None:
    if not designation or not designation.strip():
        raise ValueError("Designation cannot be empty")
    trimmed = designation.strip()
    if len(trimmed) < 2:
        raise ValueError("Designation must be at least 2 characters long")
    if not any(c.isalpha() for c in trimmed):
        raise ValueError("Designation must contain at least one letter")
    # Limit symbols (allow letters, numbers, spaces, hyphens, apostrophes)
    alnum_or_space = sum(1 for c in trimmed if c.isalnum() or c.isspace() or c in "'\\-")
    if len(trimmed) > 0 and alnum_or_space / len(trimmed) < 0.8:
        raise ValueError("Designation contains excessive special characters or symbol spam")

def validate_course_name(title: str) -> None:
    if not title or not title.strip():
        raise ValueError("Course name cannot be empty")
    trimmed = title.strip()
    if len(trimmed) < 2:
        raise ValueError("Course name must be at least 2 characters long")
    if not any(c.isalpha() for c in trimmed):
        raise ValueError("Course name must contain at least one letter")
    # Technical name symbols (e.g., .NET, C++, C#)
    allowed = sum(1 for c in trimmed if c.isalnum() or c.isspace() or c in ".+#/\\-")
    if len(trimmed) > 0 and allowed / len(trimmed) < 0.7:
        raise ValueError("Course name contains excessive special characters or symbol spam")

def validate_description(desc: str, is_required=False) -> None:
    if desc is None or desc == "":
        if is_required:
            raise ValueError("Description is required")
        return
    trimmed = desc.strip()
    if not trimmed:
        raise ValueError("Description cannot be empty or whitespace-only")
    if len(trimmed) < 5:
        raise ValueError("Description must be at least 5 characters long")
    if not any(c.isalpha() for c in trimmed):
        raise ValueError("Description must contain letters")
    allowed = sum(1 for c in trimmed if c.isalnum() or c.isspace() or c in ".,!?;:\\-()'\"@&#")
    if len(trimmed) > 0 and allowed / len(trimmed) < 0.7:
        raise ValueError("Description contains excessive special characters or symbol spam")

def validate_url(url: str, is_required=False) -> None:
    if not url or not url.strip():
        if is_required:
            raise ValueError("URL is required")
        return
    trimmed = url.strip()
    if trimmed.startswith('/uploads/'):
        return
    
    url_pattern = r'^(https?://)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(/\S*)?$'
    yt_pattern = r'^(https?://)?(www\.)?(youtube\.com|youtu\.be)/\S+$'
    
    if not re.match(url_pattern, trimmed, re.IGNORECASE) and not re.match(yt_pattern, trimmed, re.IGNORECASE):
        raise ValueError("Invalid URL format")

def validate_numeric_range(val, min_val, max_val, field_name: str) -> None:
    try:
        num = float(val)
    except (ValueError, TypeError):
        raise ValueError(f"{field_name} must be a valid number")
    if num < min_val:
        raise ValueError(f"{field_name} cannot be less than {min_val}")
    if num > max_val:
        raise ValueError(f"{field_name} cannot be greater than {max_val}")

SIZE_LIMITS = {
    "image": 10 * 1024 * 1024,      # 10 MB
    "document": 50 * 1024 * 1024,   # 50 MB
    "video": 1024 * 1024 * 1024,    # 1 GB
    "archive": 50 * 1024 * 1024,    # 50 MB (ZIP/RAR/7Z)
}

ALLOWED_EXTENSIONS = {
    "image": {".jpg", ".jpeg", ".png", ".webp"},
    "document": {".pdf", ".doc", ".docx", ".xlsx", ".xls", ".ppt", ".pptx", ".txt"},
    "video": {".mp4", ".mov", ".webm"},
    "archive": {".zip", ".rar", ".7z"}
}

ALLOWED_MIMES = {
    "image": {"image/jpeg", "image/png", "image/webp"},
    "document": {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain"
    },
    "video": {"video/mp4", "video/quicktime", "video/webm"},
    "archive": {
        "application/zip",
        "application/x-zip-compressed",
        "application/vnd.rar",
        "application/x-rar-compressed",
        "application/x-7z-compressed"
    }
}

def validate_uploaded_file(file, category: str, allow_archives: bool = False):
    """
    Validates uploaded file's extension, double extensions, size, and magic numbers (MIME type).
    Raises ValueError on validation failure.
    """
    import os
    import zipfile
    import io
    from fastapi import UploadFile

    filename = getattr(file, "filename", "")
    if not filename:
        raise ValueError("Filename is missing.")

    ext = os.path.splitext(filename)[1].lower()

    # Determine file's category & check extension
    resolved_category = None
    if category in ALLOWED_EXTENSIONS and ext in ALLOWED_EXTENSIONS[category]:
        resolved_category = category
    elif allow_archives and ext in ALLOWED_EXTENSIONS["archive"]:
        resolved_category = "archive"
    
    # Fallback/cross-checking if category is mixed (e.g. employee submit can be image, document, or video/archive)
    if not resolved_category and allow_archives:
        for cat in ["image", "document", "video", "archive"]:
            if ext in ALLOWED_EXTENSIONS[cat]:
                resolved_category = cat
                break

    if not resolved_category:
        raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")

    # Extension check: reject any double extensions containing blocked scripts or executables
    parts = filename.lower().split('.')
    blocked_exts = {'exe', 'bat', 'cmd', 'ps1', 'sh', 'php', 'jsp', 'asp', 'js'}
    for part in parts[:-1]:
        if part in blocked_exts:
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")

    # Size validation
    try:
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
    except Exception:
        # Fallback if seek not supported
        size = 0

    limit = SIZE_LIMITS[resolved_category]
    if size > limit:
        limit_mb = limit // (1024 * 1024)
        raise ValueError(f"File size exceeds the maximum limit of {limit_mb} MB for {resolved_category}s.")

    # Read first 2048 bytes for signature checking
    try:
        header = file.file.read(2048)
        file.file.seek(0)
    except Exception:
        header = b""

    # Prevent common script or executable headers
    if header.startswith(b'MZ') or header.startswith(b'#!') or b'<?php' in header:
        raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")

    # Signature checks per extension
    if ext == ".pdf":
        if not header.startswith(b'%PDF'):
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
    elif ext in {".jpg", ".jpeg"}:
        if not header.startswith(b'\xff\xd8\xff'):
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
    elif ext == ".png":
        if not header.startswith(b'\x89PNG\r\n\x1a\n'):
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
    elif ext == ".webp":
        if not (header.startswith(b'RIFF') and header[8:12] == b'WEBP'):
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
    elif ext == ".webm":
        if not header.startswith(b'\x1aE\xdf\xa3'):
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
    elif ext == ".mp4":
        if len(header) < 8 or header[4:8] != b'ftyp':
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
    elif ext == ".mov":
        is_mov = (len(header) >= 8 and (header[4:8] == b'ftyp' or header[4:8] in {b'moov', b'mdat', b'free', b'wide'}))
        if not is_mov:
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
    elif ext in {".doc", ".xls", ".ppt"}:
        if not header.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'):
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
    elif ext in {".docx", ".xlsx", ".pptx"}:
        if not header.startswith(b'PK\x03\x04'):
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
        try:
            file_bytes = file.file.read()
            file.file.seek(0)
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                names = z.namelist()
                if ext == ".docx" and not any(n.startswith("word/") or n.startswith("_rels/") for n in names):
                    raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
                elif ext == ".xlsx" and not any(n.startswith("xl/") or n.startswith("_rels/") for n in names):
                    raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
                elif ext == ".pptx" and not any(n.startswith("ppt/") or n.startswith("_rels/") for n in names):
                    raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
        except Exception:
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
    elif ext == ".txt":
        try:
            header.decode("utf-8")
            if b'\x00' in header:
                raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
        except UnicodeDecodeError:
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
    elif ext == ".zip":
        if not header.startswith(b'PK\x03\x04'):
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
        try:
            file.file.seek(0)
            zip_bytes = file.file.read()
            file.file.seek(0)
            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
                names = z.namelist()
                for name in names:
                    nested_ext = os.path.splitext(name)[1].lower()
                    if nested_ext.lstrip('.') in blocked_exts:
                        raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
        except Exception as e:
            if "Only PDF" in str(e):
                raise e
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
    elif ext == ".rar":
        if not (header.startswith(b'Rar!\x1a\x07\x00') or header.startswith(b'Rar!\x1a\x07\x01\x00')):
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")
    elif ext == ".7z":
        if not header.startswith(b'7z\xbc\xaf\x27\x1c'):
            raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")

    # Validate against file.content_type if present
    content_type = getattr(file, "content_type", None)
    if content_type:
        content_type = content_type.lower()
        if content_type not in ALLOWED_MIMES[resolved_category]:
            # Octet stream fallback for standard document files
            if content_type != "application/octet-stream" or resolved_category != "document":
                raise ValueError("Only PDF, DOCX, JPG, PNG and MP4 files are allowed.")

def validate_video_url(url: str) -> None:
    """
    Validates that a video URL matches allowed domains (YouTube, Vimeo, localhost, or R2).
    """
    from urllib.parse import urlparse

    if not url or not url.strip():
        return
    
    trimmed = url.strip()

    # Allowed relative local paths
    if trimmed.startswith('/uploads/') or trimmed.startswith('uploads/'):
        return

    # If it has no scheme/protocol, it could be a plain R2 file key or simple domain
    parsed = urlparse(trimmed)
    if not parsed.scheme or not parsed.netloc:
        # Check if it looks like a file key (alphanumeric with extensions) or simple hostname
        # If it doesn't contain a slash, it's a file key (filename).
        if '/' not in trimmed:
            # Plain R2 key is allowed
            return
        # If it contains slash but no scheme, try parsing with prepended scheme
        parsed = urlparse("https://" + trimmed)

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Invalid URL format")

    hostname = hostname.lower()
    allowed_domains = ["youtube.com", "youtu.be", "vimeo.com", "pub-15434e9e4db6402892098a597dc510ea.r2.dev"]

    is_allowed = False
    if hostname == "localhost" or hostname.startswith("127.0.0.1"):
        is_allowed = True
    else:
        for domain in allowed_domains:
            if hostname == domain or hostname.endswith("." + domain):
                is_allowed = True
                break

    if not is_allowed:
        raise ValueError("Domain is not allowed")

def validate_and_log_upload(file, category: str, db, request, current_user, upload_location: str, allow_archives: bool = False):
    """
    Centralized function that validates an uploaded file. If it fails,
    logs the FILE_UPLOAD_BLOCKED event to the DB and console, and raises a 400 HTTPException.
    """
    from database import log_audit_event
    from fastapi import HTTPException
    import json
    import os

    try:
        validate_uploaded_file(file, category, allow_archives)
    except ValueError as e:
        reason = str(e)
        
        # Extract user information
        user_id = None
        user_email = "anonymous"
        company_id = None
        if current_user:
            if isinstance(current_user, dict):
                user_id = current_user.get("id")
                user_email = current_user.get("email", "unknown")
                company_id = current_user.get("company_id")
            else:
                user_id = getattr(current_user, "id", None)
                user_email = getattr(current_user, "email", "unknown")
                company_id = getattr(current_user, "company_id", None)
        
        # Extract request information
        client_ip = "unknown"
        if request:
            client_ip = request.client.host if request.client else "unknown"

        # Extract file info
        filename = getattr(file, "filename", "unknown")
        ext = os.path.splitext(filename)[1].lower() if filename else ""
        content_type = getattr(file, "content_type", "unknown")

        log_details = {
            "user_id": user_id,
            "user_email": user_email,
            "client_ip": client_ip,
            "file_name": filename,
            "file_extension": ext,
            "mime_type": content_type,
            "upload_location": upload_location,
            "reason": reason
        }

        # 1. Log to AuditLog DB table
        log_audit_event(
            db=db,
            action="FILE_UPLOAD_BLOCKED",
            actor_id=user_id,
            target=filename,
            details=json.dumps(log_details),
            company_id=company_id
        )

        # 2. Write matching security log to console
        console_log_msg = (
            f"[SECURITY WARNING] FILE_UPLOAD_BLOCKED | "
            f"User: {user_email} (ID: {user_id}) | IP: {client_ip} | "
            f"File: {filename} ({ext}, {content_type}) | Location: {upload_location} | "
            f"Reason: {reason}"
        )
        print(console_log_msg)

        # 3. Raise HTTPException
        raise HTTPException(status_code=400, detail=reason)


