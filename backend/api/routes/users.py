# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from db.postgres import get_db
from models.user import User
from api.routes.auth import get_current_user
from services.storage_service import storage_service
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/users", tags=["Utilisateurs"])

class ProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    name: str | None = None
    email: str | None = None

@router.put("/profile")
async def update_profile(
    profile: ProfileUpdate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if profile.first_name is not None:
        current_user.first_name = profile.first_name
    if profile.last_name is not None:
        current_user.last_name = profile.last_name
    if profile.name is not None:
        current_user.name = profile.name
        
    # Automatically update full name if first and last are provided but name is not
    if profile.name is None and current_user.first_name and current_user.last_name:
        current_user.name = f"{current_user.first_name} {current_user.last_name}".strip()
        
    if profile.email is not None:
        current_user.email = profile.email
    
    # Generate SaaS email automatically based on names if they exist
    if current_user.first_name and current_user.last_name:
        base_saas_email = f"{current_user.first_name.lower()}.{current_user.last_name.lower()}@terasprint.com"
        # Check for uniqueness
        existing_user = db.query(User).filter(User.saas_email == base_saas_email, User.id != current_user.id).first()
        if existing_user:
            saas_email = f"{current_user.first_name.lower()}.{current_user.last_name.lower()}{str(current_user.id)[:4]}@terasprint.com"
        else:
            saas_email = base_saas_email
        current_user.saas_email = saas_email

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")
        
    return {"message": "Profile updated", "user": {
        "id": current_user.id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "name": current_user.name,
        "saas_email": current_user.saas_email
    }}

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File provided is not an image.")

    content = await file.read()
    ext = file.filename.split('.')[-1]
    filename = f"{current_user.id}-{uuid.uuid4().hex[:8]}.{ext}"

    try:
        public_url = storage_service.upload_avatar(content, filename, file.content_type)
        current_user.avatar_url = public_url
        db.commit()
        return {"message": "Avatar uploaded", "avatar_url": public_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload avatar: {e}")
