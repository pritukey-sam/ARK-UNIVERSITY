from database import SessionLocal
from models import User
from auth import hash_password

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == 'testadmin@lumina.com').first()
    if not user:
        user = User(
            email='testadmin@lumina.com', 
            password_hash=hash_password('admin123'), 
            name='Test Admin', 
            role='admin', 
            avatar_initials='TA'
        )
        db.add(user)
        db.commit()
        print('Admin user created: testadmin@lumina.com / admin123')
    else:
        # Update password just in case
        user.password_hash = hash_password('admin123')
        db.commit()
        print('Admin user updated: testadmin@lumina.com / admin123')
finally:
    db.close()
