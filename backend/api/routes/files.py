from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from db.postgres import get_db
from api.routes.auth import get_current_user
from models.user import User
from models.project_db import Project, ProjectFileDB, TaskDB
from services.storage_service import storage_service

router = APIRouter()

@router.post("/upload")
async def upload_project_file(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    task_id: Optional[str] = Form(None),
    file_type: str = Form("document"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Uploads a file to a project (and optionally a specific task) via MinIO.
    Saves the metadata in PostgreSQL.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if task_id:
        task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        # Upload to MinIO
        file_url = storage_service.upload_project_file(
            file_content=content,
            filename=file.filename or "unnamed_file",
            content_type=file.content_type or "application/octet-stream"
        )
        
        # Save to PostgreSQL
        project_file = ProjectFileDB(
            filename=file.filename or "unnamed_file",
            file_type=file_type,
            file_url=file_url,
            project_id=project_id,
            task_id=task_id,
            uploaded_by=current_user.id
        )
        db.add(project_file)
        db.commit()
        db.refresh(project_file)
        
        return {
            "id": project_file.id,
            "filename": project_file.filename,
            "file_url": project_file.file_url,
            "file_type": project_file.file_type,
            "created_at": project_file.created_at
        }
    except Exception as e:
        db.rollback()
        import traceback
        error_details = traceback.format_exc()
        # Save error to a file in workspace for debugging
        with open("/app/upload_error.log", "w") as f:
            f.write(error_details)
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)} \n {error_details}")


@router.get("/project/{project_id}")
async def get_project_files(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all files for a specific project.
    """
    files = db.query(ProjectFileDB).filter(ProjectFileDB.project_id == project_id).order_by(ProjectFileDB.created_at.desc()).all()
    
    result = []
    for f in files:
        uploader = db.query(User).filter(User.id == f.uploaded_by).first()
        result.append({
            "id": f.id,
            "filename": f.filename,
            "file_type": f.file_type,
            "file_url": f.file_url,
            "task_id": f.task_id,
            "created_at": f.created_at,
            "uploader": {
                "id": str(uploader.id) if uploader else None,
                "name": uploader.name if uploader else "Unknown",
                "avatar_url": uploader.avatar_url if uploader else None
            }
        })
        
    return result
