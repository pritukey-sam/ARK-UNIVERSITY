import psycopg2
import os
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

def fix_permissions():
    password = urllib.parse.quote("luminalms@1234")
    connection_strings = [
        f"postgresql://postgres:{password}@localhost:5432/postgres",
        f"postgresql://postgres:{password}@localhost:5432/lumina_lms",
    ]
    
    granted = False
    for conn_str in connection_strings:
        try:
            print(f"Trying to connect with postgres...")
            conn = psycopg2.connect(conn_str)
            conn.autocommit = True
            cur = conn.cursor()
            
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
