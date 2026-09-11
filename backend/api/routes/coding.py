from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from backend.db.postgres import get_db
from backend.models.project_db import TaskDB
from backend.services.agents.coding.orchestrator import start_coding_workflow

router = APIRouter()

@router.post("/start/{task_id}")
async def start_coding(task_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
        
    task_payload = {
        "title": task.title,
        "description": task.description,
        "status": task.status.value if task.status else None,
        "subtasks": task.subtasks
    }
    
    background_tasks.add_task(start_coding_workflow, task_id, task_payload)
    
    return {"message": "Agent demarre", "task_title": task.title}
