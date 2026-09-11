# pyrefly: ignore [missing-import]
from fastapi import FastAPI
from db.postgres import engine, Base
import models.user
import models.session
import models.project_db
from api.routes import auth, ai, projects, graph, websockets, debug, workspace_persistence
import models.workspace_session
import logging

import logging
import openlit

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Désactiver les logs verbeux
logging.getLogger("openlit").setLevel(logging.ERROR)
logging.getLogger("opentelemetry").setLevel(logging.ERROR)

try:
    openlit.init(otlp_endpoint="http://phoenix:4318")
except Exception as e:
    logger.error(f"Erreur lors de l'initialisation de OpenLIT : {e}")

# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

# Initialisation de la BDD
Base.metadata.create_all(bind=engine)

# Auto-migration pour ajouter la colonne gemini
try:
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN api_key_gemini VARCHAR;"))
        logger.info("Colonne api_key_gemini ajoutée avec succès.")
except Exception as e:
    logger.info("La colonne api_key_gemini existe déjà ou ne peut être ajoutée.")

try:
    import migrate
except Exception as e:
    logger.error(f"Migration error: {e}")

app = FastAPI(title="TeraSprint API")

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
app.include_router(ai.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")

app.include_router(graph.router, prefix="/api/v1")
app.include_router(websockets.router, prefix="/api/v1")
app.include_router(workspace_persistence.router, prefix="/api/v1")
app.include_router(debug.router, prefix="/api/v1")
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "API TeraSprint et BDD sécurisées prêtes dans Docker !"}
