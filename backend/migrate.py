from db.postgres import engine
from sqlalchemy import text

try:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sprints (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                project_id VARCHAR NOT NULL REFERENCES projects(id)
            );
        """))
        conn.execute(text("""
            ALTER TABLE user_stories
            ADD COLUMN IF NOT EXISTS sprint_id VARCHAR REFERENCES sprints(id),
            ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES users(id);
        """))
        conn.execute(text("""
            ALTER TABLE tasks
            ADD COLUMN IF NOT EXISTS sprint_id VARCHAR REFERENCES sprints(id),
            ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS chat_history JSON DEFAULT '[]'::json,
            ADD COLUMN IF NOT EXISTS attachments JSON DEFAULT '[]'::json;
        """))
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
