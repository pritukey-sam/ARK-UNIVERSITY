import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback to local postgres if not set (adjust as needed)
    DATABASE_URL = "postgresql://lumina_user:password@localhost/lumina_lms"

engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        print("Starting migration...")
        
        # 1. Create companies table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS companies (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                plan_type VARCHAR(20) DEFAULT 'free',
                plan_price FLOAT DEFAULT 0.0,
                company_code VARCHAR(10) UNIQUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        print("Created companies table.")

        # 2. Add columns to users
        # Check if columns exist first to avoid errors
        cols_to_add = [
            ("company_id", "INTEGER REFERENCES companies(id)"),
            ("employee_id", "VARCHAR(50)"),
        ]
        
        for col_name, col_type in cols_to_add:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type};"))
                print(f"Added {col_name} to users.")
            except Exception as e:
                print(f"Column {col_name} might already exist in users: {e}")
                conn.execute(text("ROLLBACK;"))

        # Update role default and existing roles
        # Note: role was already there, but we might want to standardize it.
        
        # 3. Add columns to courses
        try:
            conn.execute(text("ALTER TABLE courses ADD COLUMN company_id INTEGER REFERENCES companies(id);"))
            print("Added company_id to courses.")
        except Exception as e:
            print(f"Column company_id might already exist in courses: {e}")
            conn.execute(text("ROLLBACK;"))

        # 4. Seed default company
        res = conn.execute(text("SELECT id FROM companies WHERE company_code = 'LUM'"))
        lumina_company = res.fetchone()
        
        if not lumina_company:
            res = conn.execute(text("""
                INSERT INTO companies (name, plan_type, plan_price, company_code)
                VALUES ('Lumina', 'free', 0.0, 'LUM')
                RETURNING id;
            """))
            lumina_company_id = res.fetchone()[0]
            print(f"Created default company 'Lumina' with ID {lumina_company_id}")
        else:
            lumina_company_id = lumina_company[0]
            print(f"Default company 'Lumina' already exists with ID {lumina_company_id}")

        # 5. Update existing users and courses
        conn.execute(text(f"UPDATE users SET company_id = {lumina_company_id} WHERE company_id IS NULL;"))
        conn.execute(text(f"UPDATE courses SET company_id = {lumina_company_id} WHERE company_id IS NULL;"))
        print("Assigned existing users and courses to Lumina company.")

        # 6. Create Super Admin if not exists
        res = conn.execute(text("SELECT id FROM users WHERE email = 'superadmin@lumina.com'"))
        if not res.fetchone():
            # Using a simple hash for now (should match your auth system's hash)
            # In a real scenario, you'd use the actual hashing function.
            # Assuming 'admin123' -> hash
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            hashed_pwd = pwd_context.hash("admin123")
            
            conn.execute(text(f"""
                INSERT INTO users (name, email, password_hash, role, company_id)
                VALUES ('Super Admin', 'superadmin@lumina.com', '{hashed_pwd}', 'super_admin', {lumina_company_id});
            """))
            print("Created Super Admin user.")

        conn.commit()
        print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
