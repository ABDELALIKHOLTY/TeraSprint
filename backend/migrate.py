from db.postgres import engine
from sqlalchemy import text

try:
    with engine.begin() as conn:
        conn.execute(text("""
            ALTER TABLE projects 
            ADD COLUMN IF NOT EXISTS columns JSON DEFAULT '["TO DO", "IN PROGRESS", "IN REVIEW", "DONE"]'::json;
        """))
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS api_key_openrouter VARCHAR;
        """))
    print("Migration successful")
except Exception as e:
    print(f"Migration failed: {e}")
