import os
import sys

# Ensure backend directory is in Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from database import SessionLocal
from models import User
from auth import hash_password

def reset_admin_password():
    db = SessionLocal()
    try:
        # Find the user where role = 'admin' and email = 'admin@lumina.com'
        user = db.query(User).filter(
            User.email == 'admin@lumina.com',
            User.role == 'admin'
        ).first()
        
        if not user:
            # Let's check if the user exists with a different role to be helpful
            user_different_role = db.query(User).filter(User.email == 'admin@lumina.com').first()
            if user_different_role:
                print(f"Error: User with email 'admin@lumina.com' found, but has role '{user_different_role.role}', not 'admin'.")
            else:
                print("Error: No user found with email 'admin@lumina.com' and role 'admin'.")
            return

        # Reset their password to: Admin@123
        new_password = "Admin@123"
        user.password_hash = hash_password(new_password)
        
        # Ensure they are not blocked by first login checks
        if hasattr(user, 'is_first_login'):
            user.is_first_login = False
        if hasattr(user, 'temp_password'):
            user.temp_password = None

        db.commit()
        print(f"Success: Password for admin user '{user.email}' (role: '{user.role}') has been successfully reset to '{new_password}'.")
        
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    reset_admin_password()
