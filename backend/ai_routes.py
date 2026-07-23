import os
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, ".env")
load_dotenv(dotenv_path=env_path)

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request
from validation import validate_and_log_upload
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from database import get_db
from auth import get_current_user, require_roles
from models import Module, Notes, Assignment, Submission
import PyPDF2
import google.generativeai as genai
import json
import zipfile
import requests
import io

router = APIRouter(prefix="/ai", tags=["AI Integration"])

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

class AskRequest(BaseModel):
    module_id: int
    user_question: str

class SummarizeRequest(BaseModel):
    module_id: int

class AssignmentHelpRequest(BaseModel):
    assignment_id: int

class GenerateQuizRequest(BaseModel):
    module_id: int

def extract_text_from_pdf(pdf_path_or_url: str) -> str:
    try:
        text = ""
        # Check if it's a local upload URL
        if "http://localhost:8000/uploads/" in pdf_path_or_url:
            local_path = pdf_path_or_url.replace("http://localhost:8000/", "")
            if os.path.exists(local_path):
                with open(local_path, "rb") as file:
                    reader = PyPDF2.PdfReader(file)
                    for page in reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                return text

        if pdf_path_or_url.startswith("http"):
            response = requests.get(pdf_path_or_url)
            response.raise_for_status()
            file_stream = io.BytesIO(response.content)
            reader = PyPDF2.PdfReader(file_stream)
        else:
            with open(pdf_path_or_url, "rb") as file:
                reader = PyPDF2.PdfReader(file)
                
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    except Exception as e:
        print(f"Error reading PDF from {pdf_path_or_url}: {e}")
        return ""

def get_module_content(module_id: int, db: Session, company_id: int) -> str:
    module = db.query(Module).join(Course).filter(
        Module.id == module_id, 
        Course.company_id == company_id
    ).options(
        joinedload(Module.notes),
        joinedload(Module.assignments),
        joinedload(Module.videos)
    ).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found in your company")
    
    content = f"Module Title: {module.title}\nDescription: {module.description}\n\n"
    
    if module.notes:
        for note in module.notes:
            if note.file_type == "pdf":
                pdf_text = extract_text_from_pdf(note.file_url)
                if pdf_text:
                    content += f"--- Notes ({note.file_url}) ---\n{pdf_text[:5000]}\n\n" # limit text to avoid huge token usage
    
    if module.assignments:
        for assignment in module.assignments:
            content += f"--- Assignment: {assignment.title} ---\n"
            if assignment.file_url.endswith(".pdf"):
                pdf_text = extract_text_from_pdf(assignment.file_url)
                if pdf_text:
                    content += f"{pdf_text[:2000]}\n\n"
                    
    if module.videos:
        for video in module.videos:
            content += f"--- Video: {video.title} ---\n"
            
    return content

@router.post("/ask")
async def ask_ai(req: AskRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    content = get_module_content(req.module_id, db, current_user.get("company_id"))
    
    prompt = f"""
You are ARK University AI, a helpful learning assistant for an LMS platform called ARK University.

The platform has modules, each containing:
- Videos: tutorial lessons
- Notes/Materials: PDF study documents  
- Assignments: project tasks submitted as ZIP files
- Mastery Quiz: a multiple-choice assessment to test understanding of the module. Students click the "Mastery Quiz" tab and then "Start Quiz" to attempt it. It is created by admins using AI auto-generate or manually.

Use the course content below as your primary source. If the question is about the platform itself (like how to use features) or is a general knowledge question not covered in the content, answer using your own knowledge helpfully.

Course Content:
{content}

User Question:
{req.user_question}
"""
    
    try:
        response = model.generate_content(prompt)
        return {"answer": response.text}
    except Exception as e:
        print("Error in ask_ai:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/summarize")
async def summarize_notes(req: SummarizeRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    content = get_module_content(req.module_id, db, current_user.get("company_id"))
    
    prompt = f"""
Summarize the following content into clear bullet points:

{content}
"""
    
    try:
        response = model.generate_content(prompt)
        return {"summary": response.text}
    except Exception as e:
        print("Error in summarize:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assignment-help")
async def assignment_help(req: AssignmentHelpRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    company_id = current_user.get("company_id")
    assignment = db.query(Assignment).join(Module).join(Course).filter(
        Assignment.id == req.assignment_id,
        Course.company_id == company_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found in your company")
        
    content = f"Assignment Title: {assignment.title}\n"
    if assignment.file_url.endswith(".pdf"):
        content += extract_text_from_pdf(assignment.file_url)[:3000]
        
    prompt = f"""
Guide the user step-by-step to solve this assignment:

{content}
"""
    
    try:
        response = model.generate_content(prompt)
        return {"help": response.text}
    except Exception as e:
        print("Error in assignment_help:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-quiz")
async def generate_quiz(req: GenerateQuizRequest, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    content = get_module_content(req.module_id, db, current_user.get("company_id"))
    
    prompt = f"""
    Generate 10 high-quality multiple-choice questions based on this content.
    Return ONLY a valid JSON array. Each object must have:
    - "question": string
    - "options": array of 4 strings
    - "correct_answer": integer (1-4) representing the index of the correct option.

    CONTENT:
    {content}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Clean markdown code blocks if present
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        parsed = json.loads(text.strip())
        return {"quiz": parsed}
    except Exception as e:
        print("Error in generate_quiz:", str(e))
        raise HTTPException(status_code=500, detail="AI failed to generate quiz. Please try again.")
        
# Refactoring generate quiz to use proper JSON object
@router.post("/generate-quiz-fixed")
async def generate_quiz_fixed(req: GenerateQuizRequest, db: Session = Depends(get_db), current_user=Depends(require_roles(["admin"]))):
    content = get_module_content(req.module_id, db, current_user.get("company_id"))
    
    prompt = f"""
Generate 10 multiple-choice questions from the content.

Return STRICT JSON format as an array of objects:
[
  {{
    "question": "...",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correct_answer": "1" 
  }}
]

The "correct_answer" MUST be the index (1, 2, 3, or 4) as a string.

Content:
{content}
"""
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        parsed = json.loads(text.strip())
        return {"quiz": parsed}
    except Exception as e:
        print("Error in generate_quiz_fixed:", str(e))
        raise HTTPException(status_code=500, detail="AI failed to generate quiz structure.")

@router.post("/evaluate")
async def evaluate_submission(assignment_id: int, request: Request, file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(require_roles(["admin", "hr"]))):
    validate_and_log_upload(file, "document", db, request, current_user, "ai_evaluation", allow_archives=True)
    company_id = current_user.get("company_id")
    # This expects the submitted file and the assignment context.
    # Usually we would unzip and read files, but here we'll just read file names for context
    assignment = db.query(Assignment).join(Module).join(Course).filter(
        Assignment.id == assignment_id,
        Course.company_id == company_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found in your company")
        
    assignment_content = f"Assignment Title: {assignment.title}\n"
    if assignment.file_url.endswith(".pdf"):
        assignment_content += extract_text_from_pdf(assignment.file_url)[:1000]

    file_structure = ""
    if file.filename.endswith(".zip"):
        try:
            with zipfile.ZipFile(file.file, 'r') as z:
                names = z.namelist()
                file_structure = ", ".join(names)
        except Exception as e:
            file_structure = "Failed to parse zip file."
    else:
        file_structure = "Not a zip file."
        
    prompt = f"Review this project submission structure based on the assignment requirements and provide feedback.\n\nASSIGNMENT:\n{assignment_content}\n\nSUBMITTED FILE NAMES:\n{file_structure}\n\nGive brief feedback on whether the submission seems complete based on the included files."
    
    try:
        response = model.generate_content(prompt)
        return {"feedback": response.text.strip()}
    except Exception as e:
        print("Error in evaluate_submission:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
