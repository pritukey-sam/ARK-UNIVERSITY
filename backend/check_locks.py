import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from sqlalchemy import text

def run_test():
    with engine.connect() as conn:
        print("=== ACTIVE TRANSACTIONS / QUERIES ===")
        res = conn.execute(text("""
            SELECT pid, state, query, age(clock_timestamp(), query_start) as duration
            FROM pg_stat_activity
            WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%';
        """))
        for row in res:
            print(row)

        print("\n=== BLOCKED QUERIES ===")
        res = conn.execute(text("""
            SELECT blocked_locks.pid     AS blocked_pid,
                   blocked_activity.usename  AS blocked_user,
                   blocking_locks.pid    AS blocking_pid,
                   blocking_activity.usename AS blocking_user,
                   blocked_activity.query    AS blocked_statement,
                   blocking_activity.query   AS blocking_statement
            FROM  pg_catalog.pg_locks         blocked_locks
            JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
            JOIN pg_catalog.pg_locks         blocking_locks 
                ON blocking_locks.locktype = blocked_locks.locktype
                AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
                AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
                AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
                AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
                AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
                AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
                AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
                AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
                AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
                AND blocking_locks.pid != blocked_locks.pid
            JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
            WHERE NOT blocked_locks.granted;
        """))
        blocked_found = False
        for row in res:
            blocked_found = True
            print(row)
        if not blocked_found:
            print("No blocked queries found.")

if __name__ == "__main__":
    run_test()
