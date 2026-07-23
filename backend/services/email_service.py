import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import time
from dotenv import load_dotenv

def get_backend_env_path() -> str:
    """
    Locates and returns the absolute path of the backend's .env file.
    Works reliably across standard, nested, and monorepo execution styles.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # email_service.py is in backend/services/
    # So parent of current_dir is backend/
    backend_dir = os.path.dirname(current_dir)
    return os.path.join(backend_dir, ".env")

def load_backend_env() -> str:
    env_path = get_backend_env_path()
    
    print("[ENV-LOADER-DEBUG] ----------------------------------------", flush=True)
    print(f"[ENV-LOADER-DEBUG] Attempting to load .env from: {env_path}", flush=True)
    
    if not os.path.exists(env_path):
        print(f"[ENV-LOADER-DEBUG] [X] .env file does NOT exist at path: {env_path}", flush=True)
        print("[ENV-LOADER-DEBUG] ----------------------------------------", flush=True)
        return env_path
        
    file_size = os.path.getsize(env_path)
    print(f"[ENV-LOADER-DEBUG] [V] .env file exists. Size: {file_size} bytes", flush=True)
    
    # 1. RAW .ENV FILE CONTENT DEBUGGING (Read in binary first)
    try:
        with open(env_path, "rb") as f:
            raw_bytes = f.read()
            
        print(f"[ENV-LOADER-DEBUG] Raw File Bytes Count: {len(raw_bytes)}", flush=True)
        
        # Detect Unicode BOM / signature
        bom_detected = "None"
        encoding = "utf-8"
        
        if raw_bytes.startswith(b"\xef\xbb\xbf"):
            bom_detected = "UTF-8 BOM (\\xef\\xbb\\xbf)"
            encoding = "utf-8-sig"
        elif raw_bytes.startswith(b"\xff\xfe"):
            bom_detected = "UTF-16 LE BOM (\\xff\\xfe)"
            encoding = "utf-16"
        elif raw_bytes.startswith(b"\xfe\xff"):
            bom_detected = "UTF-16 BE BOM (\\xfe\\xff)"
            encoding = "utf-16"
            
        print(f"[ENV-LOADER-DEBUG] Unicode BOM Detected: {bom_detected}", flush=True)
        print(f"[ENV-LOADER-DEBUG] Chosen Decoding Encoding: {encoding}", flush=True)
        
        # Check for null bytes or corruption
        if b"\x00" in raw_bytes:
            print("[ENV-LOADER-DEBUG] [!] WARNING: Hidden NULL bytes (\\x00) detected in raw .env! This could corrupt standard parsers.", flush=True)
            
    except Exception as e:
        print(f"[ENV-LOADER-DEBUG] [X] Failed to read raw binary of .env: {str(e)}", flush=True)
        raw_bytes = b""
        encoding = "utf-8"

    # 2. FORCE UTF-8 ENV PARSING & DECODING
    decoded_content = ""
    try:
        if raw_bytes:
            decoded_content = raw_bytes.decode(encoding, errors="replace")
            print("[ENV-LOADER-DEBUG] File decoded successfully.", flush=True)
    except Exception as e:
        print(f"[ENV-LOADER-DEBUG] [X] Decoding failed with '{encoding}'. Retrying with standard utf-8-sig (with error replacement)...", flush=True)
        try:
            decoded_content = raw_bytes.decode("utf-8-sig", errors="replace")
        except Exception as e2:
            print(f"[ENV-LOADER-DEBUG] [X] All decoding attempts failed: {str(e2)}", flush=True)
            decoded_content = ""

    # Normalize line endings (support Windows CRLF and standard LF)
    lines = decoded_content.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    print(f"[ENV-LOADER-DEBUG] Total lines read: {len(lines)}", flush=True)
    
    # 3. MANUAL ENV FALLBACK PARSER & LINE DIAGNOSTICS
    parsed_count = 0
    for idx, line in enumerate(lines, 1):
        stripped_line = line.strip()
        
        # Empty or comment lines
        if not stripped_line:
            print(f"  [Line {idx:02d}]: (empty line)", flush=True)
            continue
        if stripped_line.startswith("#"):
            print(f"  [Line {idx:02d}]: {stripped_line} (comment)", flush=True)
            continue
            
        # Detect invalid formatting / invalid separators
        if "=" not in stripped_line:
            print(f"  [Line {idx:02d}]: [!] MALFORMED LINE (No '=' separator found): '{stripped_line}'", flush=True)
            continue
            
        # Parse key-value
        parts = stripped_line.split("=", 1)
        key = parts[0].strip()
        val = parts[1].strip()
        
        # Check invalid spaces in key
        if " " in key:
            print(f"  [Line {idx:02d}]: [!] WARNING: Spaces detected in environment key: '{key}'", flush=True)
            
        # Strip surrounding quotes from value
        if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
            val = val[1:-1].strip()
            
        # Safe logging: mask credentials
        masked_val = val
        lower_key = key.lower()
        if any(secret_term in lower_key for secret_term in ["pass", "secret", "key", "token"]):
            if len(val) > 4:
                masked_val = f"{val[:2]}...{val[-2:]} (masked, len={len(val)})"
            else:
                masked_val = "*** (masked)"
        
        print(f"  [Line {idx:02d}]: Key='{key}' | Value='{masked_val}'", flush=True)
        
        # Inject into os.environ
        os.environ[key] = val
        parsed_count += 1
        
    print(f"[ENV-LOADER-DEBUG] Successfully injected {parsed_count} variables manually into os.environ.", flush=True)
    
    # Run standard load_dotenv just as a double check
    try:
        load_dotenv(dotenv_path=env_path)
    except Exception as e:
        print(f"[ENV-LOADER-DEBUG] python-dotenv load_dotenv call raised exception: {str(e)}", flush=True)
        
    print("[ENV-LOADER-DEBUG] ----------------------------------------", flush=True)
    return env_path

def is_smtp_val_valid(val) -> bool:
    if not val:
        return False
    val_str = str(val).strip()
    if not val_str:
        return False
    # Check for placeholder values
    if "<" in val_str or ">" in val_str or "COMPANY_" in val_str:
        return False
    return True

def is_smtp_configured() -> bool:
    load_backend_env()
    smtp_host = os.getenv("SMTP_HOST") or os.getenv("EMAIL_HOST") or ""
    smtp_port = os.getenv("SMTP_PORT") or os.getenv("EMAIL_PORT") or ""
    smtp_user = os.getenv("SMTP_USER") or os.getenv("EMAIL_USER") or ""
    smtp_pass = os.getenv("SMTP_PASS") or os.getenv("EMAIL_PASS") or ""
    return bool(
        is_smtp_val_valid(smtp_host) and
        is_smtp_val_valid(smtp_port) and
        is_smtp_val_valid(smtp_user) and
        is_smtp_val_valid(smtp_pass)
    )

def verify_and_log_smtp_config():
    """
    On backend startup, validates the SMTP configuration, logs status with safely masked credentials,
    and does not crash startup if crucial variables are missing or invalid.
    """
    try:
        env_path = load_backend_env()
        
        smtp_host = os.getenv("SMTP_HOST") or os.getenv("EMAIL_HOST")
        smtp_port = os.getenv("SMTP_PORT") or os.getenv("EMAIL_PORT")
        smtp_user = os.getenv("SMTP_USER") or os.getenv("EMAIL_USER")
        smtp_pass = os.getenv("SMTP_PASS") or os.getenv("EMAIL_PASS")
        smtp_from = os.getenv("SMTP_FROM") or os.getenv("EMAIL_FROM")
        
        print("[STARTUP-DIAGNOSTICS] ----------------------------------------", flush=True)
        print(f"[STARTUP-DIAGNOSTICS] Loading backend .env from: {env_path}", flush=True)
        print(f"[STARTUP-DIAGNOSTICS] File exists: {os.path.exists(env_path)}", flush=True)
        
        variables = {
            "SMTP_HOST": smtp_host,
            "SMTP_PORT": smtp_port,
            "SMTP_USER": smtp_user,
            "SMTP_PASS": smtp_pass,
            "SMTP_FROM": smtp_from
        }
        
        for name, value in variables.items():
            if not value:
                print(f"[STARTUP-DIAGNOSTICS] {name}=MISSING", flush=True)
            elif not is_smtp_val_valid(value):
                print(f"[STARTUP-DIAGNOSTICS] {name}=PLACEHOLDER (INVALID)", flush=True)
            else:
                # Mask credentials
                if name == "SMTP_USER":
                    if "@" in value:
                        parts = value.split("@")
                        masked = f"{parts[0][:3]}***@{parts[1]}"
                    else:
                        masked = f"{value[:3]}***"
                    print(f"[STARTUP-DIAGNOSTICS] {name}={masked} (LOADED)", flush=True)
                elif name == "SMTP_PASS":
                    masked = f"{value[:2]}***{value[-2:]}" if len(value) > 4 else "***"
                    print(f"[STARTUP-DIAGNOSTICS] {name}={masked} (LOADED)", flush=True)
                else:
                    print(f"[STARTUP-DIAGNOSTICS] {name}={value} (LOADED)", flush=True)
        
        # Check overall validity
        missing_or_invalid = []
        for name, value in variables.items():
            if name != "SMTP_FROM":  # SMTP_FROM is optional / has fallback
                if not value:
                    missing_or_invalid.append(f"{name} (MISSING)")
                elif not is_smtp_val_valid(value):
                    missing_or_invalid.append(f"{name} (PLACEHOLDER)")
                    
        if missing_or_invalid:
            print(f"[STARTUP-DIAGNOSTICS] [!] WARNING: SMTP configuration is incomplete or invalid: {', '.join(missing_or_invalid)}.", flush=True)
            print("[STARTUP-DIAGNOSTICS] SMTP operations will use the local console fallback dump.", flush=True)
            print("[STARTUP-DIAGNOSTICS] FastAPI startup will proceed safely.", flush=True)
            print("[STARTUP-DIAGNOSTICS] ----------------------------------------", flush=True)
        else:
            print("[STARTUP-DIAGNOSTICS] [V] SMTP configuration validated successfully!", flush=True)
            print("[STARTUP-DIAGNOSTICS] ----------------------------------------", flush=True)
            
    except Exception as e:
        print(f"[STARTUP-DIAGNOSTICS] [!] CRITICAL: Exception raised during SMTP config validation: {str(e)}", flush=True)
        print("[STARTUP-DIAGNOSTICS] FastAPI startup will proceed safely using fallback mode.", flush=True)
        print("[STARTUP-DIAGNOSTICS] ----------------------------------------", flush=True)

def send_html_email(to_email: str, subject: str, html_content: str, text_content: str = "") -> bool:
    """
    Sends a secure HTML email using standard SMTP.
    If SMTP credentials are not configured or connection fails, it logs/prints the email for local development.
    Hardened for Brevo SMTP with port 587, STARTTLS, timeouts, and retries.
    """
    load_backend_env()
    smtp_host = os.getenv("SMTP_HOST") or os.getenv("EMAIL_HOST") or ""
    smtp_port = os.getenv("SMTP_PORT") or os.getenv("EMAIL_PORT") or "587"
    smtp_user = os.getenv("SMTP_USER") or os.getenv("EMAIL_USER") or ""
    smtp_pass = os.getenv("SMTP_PASS") or os.getenv("EMAIL_PASS") or ""
    smtp_from = os.getenv("SMTP_FROM") or os.getenv("EMAIL_FROM") or "ARK University LMS <no-reply@ark-univ.edu>"

    print(f"[SMTP-LOG] --------------------------------------------------------", flush=True)
    print(f"[SMTP-LOG] Onboarding email trigger start for {to_email}", flush=True)
    print(f"[SMTP-LOG] SMTP Config Loaded: HOST={smtp_host}, PORT={smtp_port}, USER={smtp_user}, FROM={smtp_from}", flush=True)
    print(f"[SMTP-LOG] Password Provided: {bool(smtp_pass)}", flush=True)

    if not (is_smtp_val_valid(smtp_host) and is_smtp_val_valid(smtp_port) and is_smtp_val_valid(smtp_user) and is_smtp_val_valid(smtp_pass)):
        import re
        masked_text = text_content
        masked_text = re.sub(r"(Temporary Password:\s*)(\S+)", r"\1********", masked_text)
        masked_text = re.sub(r"(Password:\s*)(\S+)", r"\1********", masked_text)
        print(f"[SMTP-LOG] SMTP IS NOT CONFIGURED OR IS INVALID! Using fallback local console dump.", flush=True)
        print(f"[SMTP-LOG] Fallback Email Preview:", flush=True)
        print(f"  To: {to_email}\n  Subject: {subject}\n  Text Preview: {masked_text[:200]}...", flush=True)
        return True

    # Payload creation
    print(f"[SMTP-LOG] Constructing MIMEMultipart email payload", flush=True)
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_from
        msg["To"] = to_email
        
        if text_content:
            msg.attach(MIMEText(text_content, "plain"))
        else:
            msg.attach(MIMEText("Please enable HTML viewing to see this message.", "plain"))
            
        msg.attach(MIMEText(html_content, "html"))
    except Exception as e:
        import traceback
        print(f"[SMTP-LOG] Payload creation failed: {str(e)}", flush=True)
        traceback.print_exc()
        return False

    # SMTP Send with Retry logic (Retry up to 2 attempts)
    max_retries = 2
    for attempt in range(1, max_retries + 1):
        print(f"[SMTP-LOG] SMTP Send attempt {attempt}/{max_retries} to {to_email}", flush=True)
        try:
            port = int(smtp_port)
            if port == 465:
                print(f"[SMTP-LOG] Connecting via SMTP_SSL to {smtp_host}:{port}...", flush=True)
                server = smtplib.SMTP_SSL(smtp_host, port, timeout=15)
            else:
                print(f"[SMTP-LOG] Connecting via standard SMTP to {smtp_host}:{port}...", flush=True)
                server = smtplib.SMTP(smtp_host, port, timeout=15)
                
                print(f"[SMTP-LOG] Sending EHLO...", flush=True)
                server.ehlo()
                
                print(f"[SMTP-LOG] Starting TLS...", flush=True)
                server.starttls()
                
                print(f"[SMTP-LOG] Sending EHLO after TLS...", flush=True)
                server.ehlo()
                
            print(f"[SMTP-LOG] Authenticating as {smtp_user}...", flush=True)
            server.login(smtp_user, smtp_pass)
            
            print(f"[SMTP-LOG] Sending mail to {to_email}...", flush=True)
            res = server.sendmail(smtp_from, [to_email], msg.as_string())
            print(f"[SMTP-LOG] Sendmail response: {res}", flush=True)
            
            print(f"[SMTP-LOG] Closing connection...", flush=True)
            server.quit()
            
            print(f"[SMTP-LOG] Onboarding email successfully sent to {to_email}!", flush=True)
            return True
            
        except Exception as e:
            import traceback
            print(f"[SMTP-LOG] Attempt {attempt} failed: {str(e)}", flush=True)
            traceback.print_exc()
            if attempt < max_retries:
                print(f"[SMTP-LOG] Waiting 2 seconds before retrying...", flush=True)
                time.sleep(2)
            else:
                print(f"[SMTP-LOG] All SMTP send attempts failed.", flush=True)
                
    return False

def run_smtp_diagnostics(to_email: str) -> dict:
    """
    Runs a detailed SMTP diagnostic sending operation and returns step-by-step telemetry.
    """
    load_backend_env()
    smtp_host = os.getenv("SMTP_HOST") or os.getenv("EMAIL_HOST") or ""
    smtp_port = os.getenv("SMTP_PORT") or os.getenv("EMAIL_PORT") or "587"
    smtp_user = os.getenv("SMTP_USER") or os.getenv("EMAIL_USER") or ""
    smtp_pass = os.getenv("SMTP_PASS") or os.getenv("EMAIL_PASS") or ""
    smtp_from = os.getenv("SMTP_FROM") or os.getenv("EMAIL_FROM") or "ARK University LMS <no-reply@ark-univ.edu>"
    
    diagnostics = {
        "smtp_host": smtp_host,
        "smtp_port": smtp_port,
        "smtp_user": smtp_user,
        "smtp_pass_provided": bool(smtp_pass),
        "smtp_from": smtp_from,
        "steps": [],
        "success": False,
        "error": None
    }
    
    diagnostics["steps"].append("Starting SMTP Diagnostics")
    
    if not (is_smtp_val_valid(smtp_host) and is_smtp_val_valid(smtp_port) and is_smtp_val_valid(smtp_user) and is_smtp_val_valid(smtp_pass)):
        diagnostics["error"] = "Missing or invalid SMTP environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)."
        diagnostics["steps"].append("Validation failed: Missing or invalid variables")
        return diagnostics
        
    try:
        diagnostics["steps"].append("Constructing test email payload")
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "ARK University LMS SMTP Diagnostic Test"
        msg["From"] = smtp_from
        msg["To"] = to_email
        msg.attach(MIMEText("This is a diagnostic test email.", "plain"))
        msg.attach(MIMEText("<h3>ARK University LMS SMTP Diagnostic Test</h3><p>This is a diagnostic test email.</p>", "html"))
        
        port = int(smtp_port)
        diagnostics["steps"].append(f"Attempting connection to {smtp_host}:{port} with 15s timeout")
        
        if port == 465:
            diagnostics["steps"].append("Using SMTP_SSL for connection")
            server = smtplib.SMTP_SSL(smtp_host, port, timeout=15)
        else:
            diagnostics["steps"].append("Using standard SMTP connection")
            server = smtplib.SMTP(smtp_host, port, timeout=15)
            
            diagnostics["steps"].append("Sending EHLO command before STARTTLS")
            server.ehlo()
            
            diagnostics["steps"].append("Securing transport via STARTTLS")
            server.starttls()
            
            diagnostics["steps"].append("Sending EHLO command after STARTTLS")
            server.ehlo()
            
        diagnostics["steps"].append(f"Attempting authentication as {smtp_user}")
        server.login(smtp_user, smtp_pass)
        
        diagnostics["steps"].append(f"Attempting to send email to {to_email}")
        res = server.sendmail(smtp_from, [to_email], msg.as_string())
        diagnostics["steps"].append(f"Mail sent. Sendmail provider response: {res}")
        
        diagnostics["steps"].append("Closing SMTP connection")
        server.quit()
        
        diagnostics["steps"].append("SMTP send lifecycle completed successfully!")
        diagnostics["success"] = True
    except smtplib.SMTPAuthenticationError as e:
        diagnostics["error"] = f"SMTP Authentication failed: {str(e)}"
        diagnostics["steps"].append("Error: SMTP Authentication failed")
    except smtplib.SMTPConnectError as e:
        diagnostics["error"] = f"Failed to connect to SMTP server: {str(e)}"
        diagnostics["steps"].append("Error: Connection failed")
    except smtplib.SMTPRecipientsRefused as e:
        diagnostics["error"] = f"Recipient refused: {str(e)}"
        diagnostics["steps"].append("Error: Recipient refused")
    except Exception as e:
        import traceback
        diagnostics["error"] = f"General SMTP Exception: {str(e)}\n{traceback.format_exc()}"
        diagnostics["steps"].append(f"Error: {str(e)}")
        
    return diagnostics

def get_onboarding_template(name: str, role: str, email: str, temp_password: str) -> str:
    """
    Returns a professional onboarding HTML email template.
    """
    role_badge = role.upper()
    role_color = "#F26522" if role.lower() in ["admin", "super_admin"] else "#3b82f6" if role.lower() == "hr" else "#10b981"
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ARK University LMS</title>
        <style>
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #f9fafb;
                margin: 0;
                padding: 0;
                color: #1f2937;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                border: 1px solid #f3f4f6;
            }}
            .header {{
                background-color: #F26522;
                padding: 40px 30px;
                text-align: center;
            }}
            .header h1 {{
                color: #ffffff;
                margin: 0;
                font-size: 26px;
                font-weight: 800;
                letter-spacing: -0.5px;
            }}
            .content {{
                padding: 40px 30px;
            }}
            .welcome {{
                font-size: 20px;
                font-weight: 700;
                color: #111827;
                margin-top: 0;
                margin-bottom: 16px;
            }}
            .intro {{
                font-size: 15px;
                line-height: 1.6;
                color: #4b5563;
                margin-bottom: 24px;
            }}
            .credential-card {{
                background-color: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 28px;
            }}
            .credential-row {{
                margin-bottom: 12px;
                font-size: 14px;
            }}
            .credential-row:last-child {{
                margin-bottom: 0;
            }}
            .credential-label {{
                font-weight: 700;
                color: #6b7280;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.5px;
                display: inline-block;
                width: 130px;
            }}
            .credential-value {{
                color: #111827;
                font-weight: 600;
            }}
            .badge {{
                display: inline-block;
                padding: 2px 8px;
                font-size: 11px;
                font-weight: 700;
                border-radius: 4px;
                color: white;
                background-color: {role_color};
            }}
            .alert-box {{
                background-color: #fffbeb;
                border-left: 4px solid #f59e0b;
                padding: 16px;
                border-radius: 0 8px 8px 0;
                margin-bottom: 28px;
                font-size: 14px;
                color: #78350f;
                line-height: 1.5;
            }}
            .btn-container {{
                text-align: center;
                margin-bottom: 32px;
            }}
            .btn {{
                background-color: #F26522;
                color: #ffffff !important;
                padding: 14px 32px;
                text-decoration: none;
                font-weight: 700;
                border-radius: 10px;
                font-size: 15px;
                display: inline-block;
                box-shadow: 0 4px 10px rgba(242, 101, 34, 0.2);
            }}
            .footer {{
                background-color: #f9fafb;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
                font-size: 12px;
                color: #9ca3af;
                line-height: 1.5;
            }}
            .footer a {{
                color: #F26522;
                text-decoration: none;
                font-weight: 500;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>ARK University LMS</h1>
            </div>
            <div class="content">
                <p class="welcome">Welcome to the Platform, {name}!</p>
                <p class="intro">
                    An administrative account has been created for you on the <strong>ARK University Learning Management System</strong>. You can now access your curated learning tracks, complete assigned course modules, and track your progress in real-time.
                </p>
                
                <div class="credential-card">
                    <div class="credential-row">
                        <span class="credential-label">Registered Email</span>
                        <span class="credential-value" style="color: #F26522;">{email}</span>
                    </div>
                    <div class="credential-row">
                        <span class="credential-label">Assigned Role</span>
                        <span class="badge">{role_badge}</span>
                    </div>
                    <div class="credential-row">
                        <span class="credential-label">Temporary Pass</span>
                        <span class="credential-value" style="font-family: monospace; font-size: 15px; background: #eef2f6; padding: 2px 6px; border-radius: 4px;">{temp_password}</span>
                    </div>
                </div>

                <div class="alert-box">
                    <strong>Mandatory Security Action:</strong><br>
                    For security purposes, you are required to change this temporary password immediately upon your first login. You will not be granted access to your dashboard until your password has been securely updated.
                </div>

                <div class="btn-container">
                    <a href="http://localhost:3000/login" class="btn" target="_blank">Access Your Account</a>
                </div>

                <p class="intro" style="font-size: 13px; color: #9ca3af; text-align: center;">
                    If the button above does not work, copy and paste this link into your browser:<br>
                    <a href="http://localhost:3000/login" style="color: #F26522;">http://localhost:3000/login</a>
                </p>
            </div>
            <div class="footer">
                &copy; 2026 ARK University LMS. All rights reserved.<br>
                Empowering corporate skill intelligence and training at scale.
            </div>
        </div>
    </body>
    </html>
    """

def get_forgot_password_template(name: str, reset_link: str, expiry_hours: int = 1) -> str:
    """
    Returns a professional forgot password HTML email template.
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your ARK University Password</title>
        <style>
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #f9fafb;
                margin: 0;
                padding: 0;
                color: #1f2937;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                border: 1px solid #f3f4f6;
            }}
            .header {{
                background-color: #111827;
                padding: 40px 30px;
                text-align: center;
            }}
            .header h1 {{
                color: #ffffff;
                margin: 0;
                font-size: 26px;
                font-weight: 800;
                letter-spacing: -0.5px;
            }}
            .content {{
                padding: 40px 30px;
            }}
            .welcome {{
                font-size: 20px;
                font-weight: 700;
                color: #111827;
                margin-top: 0;
                margin-bottom: 16px;
            }}
            .intro {{
                font-size: 15px;
                line-height: 1.6;
                color: #4b5563;
                margin-bottom: 24px;
            }}
            .warning-box {{
                background-color: #f3f4f6;
                border-left: 4px solid #9ca3af;
                padding: 16px;
                border-radius: 0 8px 8px 0;
                margin-bottom: 28px;
                font-size: 13px;
                color: #4b5563;
                line-height: 1.5;
            }}
            .btn-container {{
                text-align: center;
                margin-bottom: 32px;
            }}
            .btn {{
                background-color: #F26522;
                color: #ffffff !important;
                padding: 14px 32px;
                text-decoration: none;
                font-weight: 700;
                border-radius: 10px;
                font-size: 15px;
                display: inline-block;
                box-shadow: 0 4px 10px rgba(242, 101, 34, 0.2);
            }}
            .footer {{
                background-color: #f9fafb;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
                font-size: 12px;
                color: #9ca3af;
                line-height: 1.5;
            }}
            .footer a {{
                color: #F26522;
                text-decoration: none;
                font-weight: 500;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="color: #ffffff;">ARK University LMS</h1>
            </div>
            <div class="content">
                <p class="welcome">Hello, {name}</p>
                <p class="intro">
                    We received a request to reset your account password for the <strong>ARK University LMS</strong>. If you made this request, please click the secure link below to set a new password:
                </p>
                
                <div class="btn-container">
                    <a href="{reset_link}" class="btn" target="_blank">Reset Password</a>
                </div>

                <div class="warning-box">
                    <strong>Important Security Note:</strong><br>
                    This secure link is single-use and will automatically expire in <strong>{expiry_hours} hour</strong>. If you did not initiate this request, you can safely ignore this email; your current password remains secure and unchanged.
                </div>

                <p class="intro" style="font-size: 13px; color: #9ca3af; text-align: center;">
                    If the button above does not work, copy and paste this link into your browser:<br>
                    <a href="{reset_link}" style="color: #F26522;">{reset_link}</a>
                </p>
            </div>
            <div class="footer">
                &copy; 2026 ARK University LMS. All rights reserved.<br>
                Empowering corporate skill intelligence and training at scale.
            </div>
        </div>
    </body>
    </html>
    """
