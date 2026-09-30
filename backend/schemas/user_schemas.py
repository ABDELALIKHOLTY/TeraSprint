# pyrefly: ignore [missing-import]
from pydantic import BaseModel,EmailStr
import uuid

class UserCreate(BaseModel):
    name: str
    email:EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: str | None = None

class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None
    saas_email: str | None = None
    role: str
    mfa_enabled: bool
    has_groq_key: bool = False
    has_openrouter_key: bool = False
    has_gemini_key: bool = False
    has_github_token: bool = False
    needs_password_setup: bool = False
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class UserUpdateKey(BaseModel):
    groq_api_key: str | None = None
    openrouter_api_key: str | None = None
    gemini_api_key: str | None = None
