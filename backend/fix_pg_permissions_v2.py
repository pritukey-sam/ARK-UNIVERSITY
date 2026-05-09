import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def fix_permissions():
    # Try the user's known password for postgres
    connection_strings = [
        "postgresql://postgres:luminalms@1234@localhost:5432/postgres",
        "postgresql://postgres:luminalms@1234@localhost:5432/lumina_lms",
    ]
    
    granted = False
    for conn_str in connection_strings:
        try:
            print(f"Trying to connect with {conn_str.split('@')[0]}...")
            conn = psycopg2.connect(conn_str)
            conn.autocommit = True
            cur = conn.cursor()
            
            # Switch to lumina_lms context if not there
            cur.execute("GRANT ALL ON SCHEMA public TO lumina_user;")
            cur.execute("ALTER SCHEMA public OWNER TO lumina_user;")
            
            print("Successfully granted permissions to lumina_user!")
            conn.close()
            granted = True
            break
        except Exception as e:
            print(f"Failed: {e}")
            
    if not granted:
        print("\nACTION REQUIRED: Please fix PG permissions.")

if __name__ == "__main__":
    fix_permissions()
