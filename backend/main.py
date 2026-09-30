# pyrefly: ignore [missing-import]
from fastapi import FastAPI
from db.postgres import engine, Base
import models.user
import models.session
import models.project_db
from api.routes import auth, ai, projects, graph, websockets, debug, workspace_persistence, sprints, coding, users, files
import models.workspace_session
import logging
import openlit
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Désactiver les logs verbeux
logging.getLogger("openlit").setLevel(logging.ERROR)
logging.getLogger("opentelemetry").setLevel(logging.CRITICAL)
logging.getLogger("opentelemetry.instrumentation.instrumentor").setLevel(logging.CRITICAL)

try:
    openlit.init(otlp_endpoint="http://phoenix:4318")
except Exception as e:
    logger.error(f"Erreur lors de l'initialisation de OpenLIT : {e}")

# Initialisation de la BDD
Base.metadata.create_all(bind=engine)

# Auto-migration pour ajouter les colonnes manquantes
try:
    from sqlalchemy import text
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN api_key_gemini VARCHAR;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN first_name VARCHAR;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_name VARCHAR;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN saas_email VARCHAR;"))
        except Exception:
            pass
            
        try:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN chat_history JSON DEFAULT '[]'::json;"))
        except Exception:
            pass
            
        try:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN attachments JSON DEFAULT '[]'::json;"))
        except Exception:
            pass
            
        try:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN time_logs JSON DEFAULT '[]'::json;"))
        except Exception:
            pass
            
        try:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN history JSON DEFAULT '[]'::json;"))
        except Exception:
            pass
            
        try:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN links JSON DEFAULT '[]'::json;"))
        except Exception:
            pass

        try:
            conn.execute(text("ALTER TABLE epics ADD COLUMN assignee_id UUID REFERENCES users(id);"))
        except Exception:
            pass

        try:
            conn.execute(text("ALTER TABLE user_stories ADD COLUMN assignee_id UUID REFERENCES users(id);"))
        except Exception:
            pass
        except Exception:
            pass
            
        try:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN sprint_id VARCHAR;"))
        except Exception:
            pass
            
        try:
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS project_files (
                id VARCHAR PRIMARY KEY,
                filename VARCHAR NOT NULL,
                file_type VARCHAR NOT NULL,
                file_url VARCHAR NOT NULL,
                project_id VARCHAR NOT NULL REFERENCES projects(id),
                task_id VARCHAR REFERENCES tasks(id),
                uploaded_by UUID NOT NULL REFERENCES users(id),
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
            )
            """))
        except Exception as e:
            logger.error(f"Failed to create project_files table: {e}")
            
    # Commit happens automatically in AUTOCOMMIT mode
except Exception as e:
    logger.error(f"Error during schema migration: {e}")

from contextlib import asynccontextmanager
import threading
from services.agents.coding.orchestrator import get_semantic_memory

@asynccontextmanager
async def lifespan(app: FastAPI):
    def load_memory_bg():
        logger.info("Début du chargement en arrière-plan du modèle HuggingFace...")
        get_semantic_memory()
        logger.info("Modèle HuggingFace chargé avec succès en arrière-plan.")
    
    threading.Thread(target=load_memory_bg, daemon=True).start()
    yield

app = FastAPI(title="TeraSprint API", version="1.0", lifespan=lifespan)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion des routes
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(sprints.router, prefix="/api/v1")
app.include_router(files.router, prefix="/api/v1/files", tags=["files"])
app.include_router(ai.router, prefix="/api/v1")
app.include_router(coding.router, prefix="/api/v1")
app.include_router(websockets.router, prefix="/api/v1")
app.include_router(graph.router, prefix="/api/v1")
app.include_router(debug.router, prefix="/api/v1")
app.include_router(workspace_persistence.router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "API TeraSprint et BDD sécurisées prêtes dans Docker !"}

