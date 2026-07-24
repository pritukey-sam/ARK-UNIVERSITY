import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from database import SessionLocal
from models import User
from auth import hash_password

def seed():
    db = SessionLocal()
    try:
        users_data = [
            {
                "email": "admin@lumina.com",
                "password": "Admin@123",
                "name": "Admin User",
                "role": "admin",
                "avatar_initials": "AU"
            },
            {
                "email": "user@lumina.com",
                "password": "User@123",
                "name": "Regular Employee",
                "role": "user",
                "avatar_initials": "RE"
            }
        ]

        for udata in users_data:
            user = db.query(User).filter(User.email == udata["email"]).first()
            if not user:
                user = User(
                    email=udata["email"],
                    password_hash=hash_password(udata["password"]),
                    name=udata["name"],
                    role=udata["role"],
                    avatar_initials=udata["avatar_initials"],
                    is_active=True,
                    is_first_login=False
                )
                db.add(user)
                print(f"Created user: {udata['email']} / {udata['password']} (Role: {udata['role']})")
            else:
                user.password_hash = hash_password(udata["password"])
                user.is_active = True
                if hasattr(user, 'is_first_login'):
                    user.is_first_login = False
                print(f"Updated password for: {udata['email']} / {udata['password']}")

        db.commit()
        print("All default users seeded successfully into Supabase PostgreSQL Database!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
