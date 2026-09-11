import uuid
import enum
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, Boolean, DateTime, Enum
# pyrefly: ignore [missing-import]
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from db.postgres import Base

class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String, nullable=True)
    api_key_groq = Column(String, nullable=True)
    api_key_openrouter = Column(String, nullable=True)
    api_key_gemini = Column(String, nullable=True)
    github_access_token = Column(String, nullable=True)
    
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
