from database import SessionLocal
from models import Module
from sqlalchemy.orm import joinedload
db = SessionLocal()
module_id = 2
module = db.query(Module).filter(Module.id == module_id).options(
    joinedload(Module.videos), joinedload(Module.notes),
    joinedload(Module.assignments), joinedload(Module.quizzes)
).first()
if module:
    print("Module found:", module.title)
    print("Order:", module.order)
    print("Videos count:", len(module.videos))
else:
    print("Module not found")
db.close()
