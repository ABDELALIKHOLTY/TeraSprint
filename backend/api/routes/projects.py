# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Depends
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db.postgres import get_db
from models.project_db import Project, EpicDB, UserStoryDB, TaskDB
import uuid
from schemas.project_schemas import Backlog
# pyrefly: ignore [missing-import]
import traceback
from services.agents.conception.po_agent import generate_agile_backlog
from api.routes.auth import get_current_user
from models.user import User
from fastapi.responses import StreamingResponse
import httpx
import json

router = APIRouter(prefix="/projects", tags=["Projets & Génération (Agent PO)"])

class ProjectIdea(BaseModel):
    idea: str
    ai_model: str = "qwen2.5:14b"

@router.post("/generate")
async def generate_project(payload: ProjectIdea, current_user: User = Depends(get_current_user)):
    """
    Prend une idée de projet en entrée et génère un backlog structuré au format JSON.
    """
    try:
        async def event_generator():
            try:
                # Use the streaming generator
                # Note: Assuming generate_agile_backlog_stream is imported instead of generate_agile_backlog
                from services.agents.conception.po_agent import generate_agile_backlog_stream
                async for event in generate_agile_backlog_stream(payload.idea, payload.ai_model, current_user.api_key_groq, current_user.api_key_openrouter, current_user.api_key_gemini):
                    yield json.dumps(event) + "\n"
            except Exception as inner_e:
                print(f"Exception dans le générateur : {str(inner_e)}")
                traceback.print_exc()
                yield json.dumps({"type": "error", "message": str(inner_e)}) + "\n"

        return StreamingResponse(event_generator(), media_type="application/x-ndjson")
    except Exception as e:
        print(f"Exception critique dans generate_project : {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération : {str(e)}")

@router.get("/models")
async def get_available_models(current_user: User = Depends(get_current_user)):
    """
    Récupère dynamiquement les modèles d'IA disponibles depuis Ollama (local)
    et Groq (si une clé API est fournie).
    """
    models = []
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get("http://host.docker.internal:11434/api/tags", timeout=2.0)
            if res.status_code == 200:
                data = res.json()
                for m in data.get("models", []):
                    name = m.get("name")
                    models.append({
                        "id": name,
                        "name": name,
                        "badge": "Local",
                        "color": "bg-emerald-500",
                        "text": "text-emerald-500",
                        "provider": "ollama"
                    })
    except Exception as e:
        print(f"Erreur Ollama models: {e}")
        models.append({"id": "qwen2.5:14b", "name": "Qwen 2.5 (14B)", "badge": "Balanced", "color": "bg-emerald-500", "text": "text-emerald-500", "provider": "ollama"})
        models.append({"id": "llama3.1", "name": "Llama 3.1", "badge": "Fast", "color": "bg-emerald-500", "text": "text-emerald-500", "provider": "ollama"})

    if current_user.api_key_groq:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {current_user.api_key_groq}"},
                    timeout=5.0
                )
                if res.status_code == 200:
                    data = res.json()
                    for m in data.get("data", []):
                        m_id = m.get("id", "")
                        if "whisper" not in m_id.lower() and "tool-use" not in m_id.lower():
                            badge = "Cloud Fast" if "8b" in m_id.lower() or "7b" in m_id.lower() else "Cloud Logic"
                            color = "bg-blue-500" if "llama" in m_id.lower() else ("bg-red-500" if "deepseek" in m_id.lower() else "bg-purple-500")
                            text_color = "text-blue-500" if "llama" in m_id.lower() else ("text-red-500" if "deepseek" in m_id.lower() else "text-purple-500")
                            
                            models.append({
                                "id": f"groq:{m_id}",
                                "name": m_id,
                                "badge": badge,
                                "color": color,
                                "text": text_color,
                                "provider": "groq"
                            })
        except Exception as e:
            print(f"Erreur Groq models: {e}")

    if current_user.api_key_openrouter:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    "https://openrouter.ai/api/v1/models",
                    headers={"Authorization": f"Bearer {current_user.api_key_openrouter}"},
                    timeout=5.0
                )
                if res.status_code == 200:
                    data = res.json()
                    for m in data.get("data", []):
                        m_id = m.get("id", "")
                        badge = "OR Premium" if m.get("pricing", {}).get("prompt", "0") != "0" else "OR Free"
                        
                        models.append({
                            "id": f"openrouter:{m_id}",
                            "name": m.get("name", m_id),
                            "badge": badge,
                            "color": "bg-green-500",
                            "text": "text-green-500",
                            "provider": "openrouter"
                        })
        except Exception as e:
            print(f"Erreur OpenRouter models: {e}")

    if current_user.api_key_gemini:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={current_user.api_key_gemini}",
                    timeout=5.0
                )
                if res.status_code == 200:
                    data = res.json()
                    for m in data.get("models", []):
                        if "generateContent" in m.get("supportedGenerationMethods", []):
                            m_name_full = m.get("name", "")
                            m_id = m_name_full.replace("models/", "")
                            
                            if "vision" in m_id and "gemini" not in m_id:
                                continue
                                
                            models.append({
                                "id": f"gemini:{m_id}",
                                "name": m.get("displayName", m_id),
                                "badge": "Google Native",
                                "color": "bg-indigo-500",
                                "text": "text-indigo-500",
                                "provider": "gemini"
                            })
                else:
                    print(f"Erreur HTTP Gemini models: {res.status_code}")
        except Exception as e:
            print(f"Erreur Gemini models: {e}")
            
        if not any(m["provider"] == "gemini" for m in models):
            gemini_models = [
                {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash"},
                {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash"},
                {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro"},
                {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash"}
            ]
            for m in gemini_models:
                models.append({
                    "id": f"gemini:{m['id']}",
                    "name": m['name'],
                    "badge": "Google Native (Fallback)",
                    "color": "bg-indigo-500",
                    "text": "text-indigo-500",
                    "provider": "gemini"
                })

    return models



@router.post("/save")
async def save_project(backlog: Backlog, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Sauvegarde un backlog généré par l'IA dans la base de données.
    """
    try:
        db_project = Project(
            title=backlog.project_title,
            architecture_report=backlog.architecture_report,
            user_id=current_user.id
        )
        db.add(db_project)
        db.flush()

        for epic in backlog.epics:
            epic_id_safe = f"{db_project.id}-{epic.id}-{str(uuid.uuid4())[:6]}"
            db_epic = EpicDB(
                id=epic_id_safe,
                title=epic.title,
                project_id=db_project.id
            )
            db.add(db_epic)
            db.flush()

            for us in epic.user_stories:
                us_id_safe = f"{epic_id_safe}-{us.id}-{str(uuid.uuid4())[:6]}"
                db_us = UserStoryDB(
                    id=us_id_safe,
                    title=us.title,
                    description=us.description,
                    status=us.status,
                    priority=us.priority,
                    story_points=us.story_points,
                    acceptance_criteria=us.acceptance_criteria,
                    epic_id=db_epic.id
                )
                db.add(db_us)
                db.flush()

                for task in us.tasks:
                    task_id_safe = f"{us_id_safe}-{task.id}-{str(uuid.uuid4())[:6]}"
                    db_task = TaskDB(
                        id=task_id_safe,
                        title=task.title,
                        description=task.description,
                        status=task.status,
                        priority=task.priority,
                        story_points=task.story_points,
                        subtasks=task.subtasks,
                        user_story_id=db_us.id
                    )
                    db.add(db_task)
        
        db.commit()
        return {"status": "success", "project_id": db_project.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def get_my_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Récupère la liste des projets de l'utilisateur.
    """
    projects = db.query(Project).filter(Project.user_id == current_user.id).order_by(Project.created_at.desc()).all()
    return [{"id": p.id, "title": p.title, "created_at": p.created_at} for p in projects]

@router.get("/{project_id}")
async def get_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Récupère un projet complet par son ID (pour le dashboard).
    """
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    epics = db.query(EpicDB).filter(EpicDB.project_id == project.id).all()
    
    epics_data = []
    for epic in epics:
        user_stories = db.query(UserStoryDB).filter(UserStoryDB.epic_id == epic.id).all()
        us_data = []
        for us in user_stories:
            tasks = db.query(TaskDB).filter(TaskDB.user_story_id == us.id).all()
            tasks_data = [{
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "status": t.status,
                "priority": t.priority,
                "story_points": t.story_points,
                "subtasks": t.subtasks,
                "estimated_hours": t.estimated_hours,
                "start_date": t.start_date.isoformat() if t.start_date else None,
                "end_date": t.end_date.isoformat() if t.end_date else None
            } for t in tasks]
            
            us_data.append({
                "id": us.id,
                "title": us.title,
                "description": us.description,
                "status": us.status,
                "priority": us.priority,
                "story_points": us.story_points,
                "acceptance_criteria": us.acceptance_criteria,
                "tasks": tasks_data
            })
            
        epics_data.append({
            "id": epic.id,
            "title": epic.title,
            "user_stories": us_data
        })
        
    return {
        "project_title": project.title,
        "architecture_report": project.architecture_report,
        "columns": project.columns,
        "epics": epics_data
    }

@router.put("/{project_id}/columns")
async def update_project_columns(project_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Met à jour l'ordre ou la liste des colonnes Kanban d'un projet.
    """
    try:
        project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
            
        if "columns" in payload:
            project.columns = payload["columns"]
            db.commit()
            return {"status": "success"}
        else:
            raise HTTPException(status_code=400, detail="Missing columns in payload")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tasks/{task_id}")
async def update_task(task_id: str, task_data: dict, db: Session = Depends(get_db)):
    """
    Met à jour une tâche dans la base de données.
    """
    try:
        db_task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
        if not db_task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        if "title" in task_data: db_task.title = task_data["title"]
        if "description" in task_data: db_task.description = task_data["description"]
        if "status" in task_data: db_task.status = task_data["status"]
        if "priority" in task_data: db_task.priority = task_data["priority"]
        if "story_points" in task_data: db_task.story_points = task_data["story_points"]
        if "subtasks" in task_data: db_task.subtasks = task_data["subtasks"]
        if "estimated_hours" in task_data: db_task.estimated_hours = task_data["estimated_hours"]
        
        from dateutil import parser
        if "start_date" in task_data and task_data["start_date"]:
            try:
                db_task.start_date = parser.parse(task_data["start_date"])
            except:
                pass
        if "end_date" in task_data and task_data["end_date"]:
            try:
                db_task.end_date = parser.parse(task_data["end_date"])
            except:
                pass
        
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
