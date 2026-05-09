import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def fix_sequences():
    DATABASE_URL = os.getenv("DATABASE_URL")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        # Set search path
        cur.execute("SET search_path TO app_schema, public")
        
        # Find all sequences in app_schema
        cur.execute("""
            SELECT 'SELECT setval(' || quote_literal(quote_ident(s.relname)) || 
                   ', COALESCE(MAX(' || quote_ident(c.attname) || '), 1) ) FROM ' || 
                   quote_ident(t.relname) AS query
            FROM pg_class s
            JOIN pg_depend d ON d.objid = s.oid
            JOIN pg_attribute c ON c.attrelid = d.refobjid AND c.attnum = d.refobjsubid
            JOIN pg_class t ON t.oid = d.refobjid
            WHERE s.relkind = 'S' 
              AND d.deptype = 'a' 
              AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'app_schema')
        """)
        
        queries = cur.fetchall()
        for row in queries:
            query = row[0]
            print(f"Executing: {query}")
            cur.execute(query)
            
        print("All sequences reset successfully.")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_sequences()
