from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db.postgres import get_db
from models.project_db import SprintDB
from api.routes.auth import get_current_user
from models.user import User
from typing import Optional
from datetime import datetime
import uuid

router = APIRouter(prefix="/projects", tags=["Sprints"])

class SprintCreate(BaseModel):
    name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class SprintUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

@router.post("/{project_id}/sprints")
async def create_sprint(project_id: str, sprint_data: SprintCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from dateutil import parser
    try:
        new_sprint = SprintDB(
            id=str(uuid.uuid4()),
            name=sprint_data.name,
            project_id=project_id
        )
        if sprint_data.start_date:
            try:
                new_sprint.start_date = parser.parse(sprint_data.start_date)
            except: pass
        if sprint_data.end_date:
            try:
                new_sprint.end_date = parser.parse(sprint_data.end_date)
            except: pass
            
        db.add(new_sprint)
        db.commit()
        db.refresh(new_sprint)
        return {"id": new_sprint.id, "name": new_sprint.name, "start_date": new_sprint.start_date, "end_date": new_sprint.end_date}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{project_id}/sprints")
async def get_sprints(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sprints = db.query(SprintDB).filter(SprintDB.project_id == project_id).all()
    return [{
        "id": s.id,
        "name": s.name,
        "start_date": s.start_date.isoformat() if s.start_date else None,
        "end_date": s.end_date.isoformat() if s.end_date else None
    } for s in sprints]

@router.put("/sprints/{sprint_id}")
async def update_sprint(sprint_id: str, sprint_data: SprintUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        sprint = db.query(SprintDB).filter(SprintDB.id == sprint_id).first()
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")
            
        from dateutil import parser
        if sprint_data.name is not None:
            sprint.name = sprint_data.name
        if sprint_data.start_date is not None:
            try: sprint.start_date = parser.parse(sprint_data.start_date)
            except: pass
        if sprint_data.end_date is not None:
            try: sprint.end_date = parser.parse(sprint_data.end_date)
            except: pass
            
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
