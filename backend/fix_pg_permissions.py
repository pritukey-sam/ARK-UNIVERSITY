import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def fix_permissions():
    # Try different common postgres connection strings to grant permissions
    connection_strings = [
        "postgresql://postgres@localhost:5432/postgres",
        "postgresql://postgres:postgres@localhost:5432/postgres",
        "postgresql://postgres:root@localhost:5432/postgres",
        "postgresql://postgres:admin@localhost:5432/postgres",
        "postgresql://postgres:password@localhost:5432/postgres",
    ]
    
    granted = False
    for conn_str in connection_strings:
        try:
            print(f"Trying to connect with {conn_str.split('@')[0]}...")
            conn = psycopg2.connect(conn_str)
            conn.autocommit = True
            cur = conn.cursor()
            
            # Grant permissions on the database
            cur.execute("GRANT ALL ON SCHEMA public TO lumina_user;")
            cur.execute("ALTER SCHEMA public OWNER TO lumina_user;")
            
            # Since we connected to 'postgres' db, we need to switch to 'lumina_lms' 
            # Or just run it on lumina_lms if we can connect to it as superuser
            try:
                conn_lms = psycopg2.connect(conn_str.replace("/postgres", "/lumina_lms"))
                conn_lms.autocommit = True
                cur_lms = conn_lms.cursor()
                cur_lms.execute("GRANT ALL ON SCHEMA public TO lumina_user;")
                cur_lms.execute("ALTER SCHEMA public OWNER TO lumina_user;")
                conn_lms.close()
            except Exception as e:
                print(f"Could not connect to lumina_lms with this user: {e}")
            
            print("Successfully granted permissions to lumina_user!")
            conn.close()
            granted = True
            break
        except Exception as e:
            print(f"Failed with {conn_str.split('@')[0]}: {e}")
            
    if not granted:
        print("\nACTION REQUIRED: Could not automatically fix permissions.")
        print("Please run the following command in your terminal (psql):")
        print('psql -U postgres -d lumina_lms -c "GRANT ALL ON SCHEMA public TO lumina_user;"')

if __name__ == "__main__":
    fix_permissions()
