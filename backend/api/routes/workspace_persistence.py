from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from db.postgres import get_db
from api.routes.auth import get_current_user
from models.user import User
from models.workspace_session import WorkspaceMessage, WorkspaceFile
from models.project_db import TaskDB, UserStoryDB, EpicDB, Project
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/workspace", tags=["Workspace Persistence"])

class FileUpdate(BaseModel):
    file_path: str
    content: str

class FileRename(BaseModel):
    old_path: str
    new_path: str


@router.get("/task/{task_id}/context")
async def get_task_context(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retourne le contexte complet d une tache (titre, description, sous-taches,
    criteres d acceptation, epic, projet) pour l agent d architecture.
    """
    task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
    
    if task:
        user_story = db.query(UserStoryDB).filter(UserStoryDB.id == task.user_story_id).first()
        epic = db.query(EpicDB).filter(EpicDB.id == user_story.epic_id).first() if user_story else None
        project = db.query(Project).filter(Project.id == epic.project_id).first() if epic else None

        return {
            "task": {
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "status": task.status,
                "priority": task.priority,
                "story_points": task.story_points,
                "subtasks": task.subtasks or [],
                "estimated_hours": task.estimated_hours,
            },
            "user_story": {
                "title": user_story.title if user_story else "",
                "description": user_story.description if user_story else "",
                "acceptance_criteria": user_story.acceptance_criteria if user_story else [],
            } if user_story else None,
            "epic": {
                "title": epic.title if epic else "",
            } if epic else None,
            "project": {
                "id": project.id if project else "",
                "title": project.title if project else "",
                "description": project.description if project else "",
                "architecture_report": project.architecture_report if project else "",
            } if project else None,
        }
        
    project = db.query(Project).filter(Project.id == task_id).first()
    if project:
        epics = db.query(EpicDB).filter(EpicDB.project_id == project.id).all()
        epic_ids = [e.id for e in epics]
        user_stories = db.query(UserStoryDB).filter(UserStoryDB.epic_id.in_(epic_ids)).all()
        us_ids = [us.id for us in user_stories]
        tasks = db.query(TaskDB).filter(TaskDB.user_story_id.in_(us_ids)).all()
        
        kanban_summary = "Liste des tâches du Kanban et leurs sous-tâches:\n"
        for i, t in enumerate(tasks, 1):
            kanban_summary += f"- Tâche {i} ({t.status}): {t.title}\n"
            if getattr(t, 'subtasks', None):
                for st in t.subtasks:
                    st_title = st.get('title', '') if isinstance(st, dict) else str(st)
                    kanban_summary += f"    * {st_title}\n"
            
        return {
            "project": {
                "id": project.id,
                "title": project.title,
                "description": project.description,
                "architecture_report": project.architecture_report,
            },
            "task": {
                "title": "Projet Global",
                "description": f"Vous êtes dans le contexte global du projet. Aidez l'utilisateur à démarrer le développement ou choisissez une tâche spécifique depuis le Kanban.\n\n{kanban_summary}",
                "subtasks": []
            }
        }
        
    raise HTTPException(status_code=404, detail="Tâche ou Projet introuvable")




@router.get("/{task_id}/messages")
async def get_messages(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Recupere l historique de conversation pour une tache."""
    msgs = (
        db.query(WorkspaceMessage)
        .filter(and_(
            WorkspaceMessage.task_id == task_id,
            WorkspaceMessage.user_id == current_user.id
        ))
        .order_by(WorkspaceMessage.created_at.asc())
        .all()
    )
    return [
        {
            "id": str(m.id),
            "sender": m.sender,
            "text": m.content,
            "timestamp": m.created_at.isoformat()
        }
        for m in msgs
    ]


@router.get("/{task_id}/files")
async def get_files(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Recupere les fichiers generes pour une tache."""
    files = (
        db.query(WorkspaceFile)
        .filter(and_(
            WorkspaceFile.task_id == task_id,
            WorkspaceFile.user_id == current_user.id
        ))
        .all()
    )
    return {f.file_path: f.content for f in files}


@router.post("/{task_id}/file")
async def create_or_update_file(
    task_id: str,
    payload: FileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cree ou met a jour un fichier pour une tache."""
    existing = db.query(WorkspaceFile).filter(and_(
        WorkspaceFile.task_id == task_id,
        WorkspaceFile.user_id == current_user.id,
        WorkspaceFile.file_path == payload.file_path
    )).first()
    
    if existing:
        existing.content = payload.content
    else:
        db.add(WorkspaceFile(
            task_id=task_id,
            user_id=current_user.id,
            file_path=payload.file_path,
            content=payload.content
        ))
    db.commit()
    return {"status": "ok", "message": "Fichier sauvegarde"}


@router.put("/{task_id}/file/rename")
async def rename_file(
    task_id: str,
    payload: FileRename,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Renomme un fichier existant."""
    existing = db.query(WorkspaceFile).filter(and_(
        WorkspaceFile.task_id == task_id,
        WorkspaceFile.user_id == current_user.id,
        WorkspaceFile.file_path == payload.old_path
    )).first()
    
    if not existing:
        raise HTTPException(status_code=404, detail="Fichier non trouve")
        
    target = db.query(WorkspaceFile).filter(and_(
        WorkspaceFile.task_id == task_id,
        WorkspaceFile.user_id == current_user.id,
        WorkspaceFile.file_path == payload.new_path
    )).first()
    
    if target:
        raise HTTPException(status_code=400, detail="Un fichier avec ce nom existe deja")
        
    existing.file_path = payload.new_path
    db.commit()
    return {"status": "ok", "message": "Fichier renomme"}


@router.delete("/{task_id}/file")
async def delete_file(
    task_id: str,
    file_path: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Supprime un fichier ou un dossier."""
    deleted = db.query(WorkspaceFile).filter(and_(
        WorkspaceFile.task_id == task_id,
        WorkspaceFile.user_id == current_user.id,
        or_(
            WorkspaceFile.file_path == file_path,
            WorkspaceFile.file_path.like(f"{file_path}/%")
        )
    )).delete(synchronize_session=False)
    
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Fichier non trouve")
        
    db.commit()
    return {"status": "ok", "message": "Fichier supprime"}


@router.delete("/{task_id}/session")
async def reset_session(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reinitialise la session (supprime messages et fichiers) pour une tache."""
    db.query(WorkspaceMessage).filter(and_(
        WorkspaceMessage.task_id == task_id,
        WorkspaceMessage.user_id == current_user.id
    )).delete()
    db.query(WorkspaceFile).filter(and_(
        WorkspaceFile.task_id == task_id,
        WorkspaceFile.user_id == current_user.id
    )).delete()
    db.commit()
    return {"status": "ok", "message": "Session reinitalisee"}
