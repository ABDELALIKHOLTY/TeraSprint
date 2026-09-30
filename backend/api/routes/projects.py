
from fastapi import APIRouter, HTTPException, Depends

from pydantic import BaseModel
from sqlalchemy.orm import Session
from db.postgres import get_db
from models.project_db import Project, EpicDB, UserStoryDB, TaskDB, ProjectMemberDB
import uuid
from schemas.project_schemas import Backlog

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

    try:
        async def event_generator():
            try:


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

    owned_projects = db.query(Project).filter(Project.user_id == current_user.id).all()
    member_projects = db.query(Project).join(ProjectMemberDB).filter(ProjectMemberDB.user_id == current_user.id).all()
    all_projects = list({p.id: p for p in (owned_projects + member_projects)}.values())
    all_projects.sort(key=lambda p: p.created_at, reverse=True)
    return [{"id": p.id, "title": p.title, "created_at": p.created_at} for p in all_projects]

@router.get("/{project_id}")
async def get_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_member = db.query(ProjectMemberDB).filter(ProjectMemberDB.project_id == project_id, ProjectMemberDB.user_id == current_user.id).first()
    if project.user_id != current_user.id and not is_member:
        raise HTTPException(status_code=403, detail="Not authorized to access this project")

    epics = db.query(EpicDB).filter(EpicDB.project_id == project.id).all()

    all_users = db.query(User).all()
    user_dict = {str(u.id): {"id": str(u.id), "name": u.name, "first_name": u.first_name, "avatar_url": u.avatar_url} for u in all_users}
    
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
                "end_date": t.end_date.isoformat() if t.end_date else None,
                "assignee_id": str(t.assignee_id) if t.assignee_id else None,
                "assignee": user_dict.get(str(t.assignee_id)) if t.assignee_id else None, "chat_history": t.chat_history, "attachments": t.attachments, "history": t.history, "links": t.links, "time_logs": t.time_logs
            } for t in tasks]
            
            us_data.append({
                "id": us.id,
                "title": us.title,
                "description": us.description,
                "status": us.status,
                "priority": us.priority,
                "story_points": us.story_points,
                "acceptance_criteria": us.acceptance_criteria,
                "assignee_id": str(us.assignee_id) if us.assignee_id else None,
                "assignee": user_dict.get(str(us.assignee_id)) if us.assignee_id else None,
                "tasks": tasks_data
            })
            
        epics_data.append({
            "id": epic.id,
            "title": epic.title,
            "assignee_id": str(epic.assignee_id) if epic.assignee_id else None,
            "assignee": user_dict.get(str(epic.assignee_id)) if epic.assignee_id else None,
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
        if "assignee_id" in task_data:
            try:
                import uuid
                db_task.assignee_id = uuid.UUID(task_data["assignee_id"]) if task_data["assignee_id"] else None
            except ValueError:
                pass
                
        if "chat_history" in task_data: db_task.chat_history = task_data["chat_history"]
        if "attachments" in task_data: db_task.attachments = task_data["attachments"]
        if "history" in task_data: db_task.history = task_data["history"]
        if "links" in task_data: db_task.links = task_data["links"]
        if "time_logs" in task_data: db_task.time_logs = task_data["time_logs"]
        
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

@router.post("/tasks/{task_id}/negotiate")
async def negotiate_task(task_id: str, data: dict, db: Session = Depends(get_db)):
    db_task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    return {"updated_task": {"id": task_id}, "ai_message": "Negotiation placeholder"}

@router.get("/{project_id}/members")
async def get_project_members(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    members_data = []
    owner = db.query(User).filter(User.id == project.user_id).first()
    if owner:
        members_data.append({"id": str(owner.id), "name": owner.name, "email": owner.email, "role": "Owner", "first_name": owner.first_name, "last_name": owner.last_name, "avatar_url": owner.avatar_url})
        
    members = db.query(ProjectMemberDB).filter(ProjectMemberDB.project_id == project_id).all()
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user and user.id != project.user_id:
            members_data.append({"id": str(user.id), "name": user.name, "email": user.email, "role": m.role, "first_name": user.first_name, "last_name": user.last_name, "avatar_url": user.avatar_url})
            
    return members_data

from pydantic import BaseModel
class AddMemberRequest(BaseModel):
    email: str
    role: str = "Member"

@router.post("/{project_id}/members")
async def add_project_member(project_id: str, req: AddMemberRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can add members")
        
    user_to_add = db.query(User).filter(User.email == req.email).first()
    if not user_to_add:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_to_add.id == project.user_id:
        raise HTTPException(status_code=400, detail="User is already the owner of this project")
        
    existing_member = db.query(ProjectMemberDB).filter(ProjectMemberDB.project_id == project_id, ProjectMemberDB.user_id == user_to_add.id).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a member of this project")
        
    new_member = ProjectMemberDB(project_id=project_id, user_id=user_to_add.id, role=req.role)
    db.add(new_member)
    db.commit()
    
    return {"message": "Member added successfully", "member": {"id": str(user_to_add.id), "name": user_to_add.name, "email": user_to_add.email, "role": req.role}}

@router.put("/epics/{epic_id}")
async def update_epic(epic_id: str, data: dict, db: Session = Depends(get_db)):
    epic = db.query(EpicDB).filter(EpicDB.id == epic_id).first()
    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")
        
    if "assignee_id" in data:
        try:
            import uuid
            new_assignee = uuid.UUID(data["assignee_id"]) if data["assignee_id"] else None
            epic.assignee_id = new_assignee
        except ValueError:
            pass
            
    if "title" in data:
        epic.title = data["title"]
        
    db.commit()
    return {"message": "Epic updated"}

@router.put("/user-stories/{us_id}")
async def update_user_story(us_id: str, data: dict, db: Session = Depends(get_db)):
    us = db.query(UserStoryDB).filter(UserStoryDB.id == us_id).first()
    if not us:
        raise HTTPException(status_code=404, detail="User story not found")
        
    if "assignee_id" in data:
        try:
            import uuid
            new_assignee = uuid.UUID(data["assignee_id"]) if data["assignee_id"] else None
            us.assignee_id = new_assignee
        except ValueError:
            pass
            
    if "title" in data:
        us.title = data["title"]
        
    db.commit()
    return {"message": "User story updated"}







