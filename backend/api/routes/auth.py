# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
import jwt
from fastapi.responses import RedirectResponse
import secrets
import uuid
import pyotp
import qrcode
import base64
import io
# pyrefly: ignore [missing-import]
from fastapi_sso.sso.google import GoogleSSO
# pyrefly: ignore [missing-import]
from fastapi_sso.sso.github import GithubSSO
from core.config import settings
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from db.postgres import get_db
from models.user import User
from models.session import Session as UserSession
from schemas.user_schemas import UserCreate, UserResponse, UserLogin, Token, UserUpdateKey
from core.security import get_password_hash, verify_password, create_access_token
from services.hibp_service import is_password_pwned
from pydantic import BaseModel
import httpx


router = APIRouter(prefix="/auth", tags=["Authentification"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def create_user_session(db: Session, user_id: uuid.UUID, request: Request) -> UserSession:
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    user_session = UserSession(user_id=user_id, ip_address=ip_address, user_agent=user_agent)
    db.add(user_session)
    db.commit()
    db.refresh(user_session)
    return user_session

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id_str: str = payload.get("sub")
        session_id_str: str = payload.get("sid")
        if user_id_str is None or session_id_str is None:
            raise credentials_exception
        try:
            user_uuid = uuid.UUID(user_id_str)
            session_uuid = uuid.UUID(session_id_str)
        except ValueError:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user_session = db.query(UserSession).filter(UserSession.id == session_uuid, UserSession.is_active == True).first()
    if not user_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expirée ou révoquée",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_uuid).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_session(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        session_id_str: str = payload.get("sid")
        return db.query(UserSession).filter(UserSession.id == uuid.UUID(session_id_str)).first()
    except Exception:
        return None

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retourne les informations du profil de l'utilisateur connecté"""
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "mfa_enabled": current_user.mfa_enabled,
        "has_groq_key": bool(current_user.api_key_groq),
        "has_openrouter_key": bool(current_user.api_key_openrouter),
        "has_gemini_key": bool(current_user.api_key_gemini),
        "has_github_token": bool(current_user.github_access_token)
    }

@router.put("/me/api-keys")
async def update_api_keys(req: UserUpdateKey, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.groq_api_key is not None:
        current_user.api_key_groq = req.groq_api_key
    if req.openrouter_api_key is not None:
        current_user.api_key_openrouter = req.openrouter_api_key
    if req.gemini_api_key is not None:
        current_user.api_key_gemini = req.gemini_api_key
    db.commit()
    return {"message": "Clés API mises à jour avec succès."}

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, request: Request, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")
        
    if await is_password_pwned(user_data.password):
        raise HTTPException(
            status_code=400, 
            detail="Ce mot de passe est compromis (fuite de données). Veuillez en choisir un autre."
        )
        
    hashed_password = get_password_hash(user_data.password)
    new_user = User(name=user_data.name, email=user_data.email, password_hash=hashed_password)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    user_session = create_user_session(db, new_user.id, request)
    access_token = create_access_token(data={"sub": str(new_user.id), "sid": str(user_session.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )
    
    if user.mfa_enabled:
        if not login_data.totp_code:
            raise HTTPException(
                status_code=403,
                detail="MFA_REQUIRED"
            )
        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(login_data.totp_code):
            raise HTTPException(
                status_code=401,
                detail="Code TOTP invalide."
            )
        
    user_session = create_user_session(db, user.id, request)
    access_token = create_access_token(data={"sub": str(user.id), "sid": str(user_session.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

google_sso = GoogleSSO(
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    redirect_uri="http://localhost:8000/api/v1/auth/google/callback",
    allow_insecure_http=True,
    use_state=False
)

@router.get("/google/login")
async def google_login():
    async with google_sso:
        return await google_sso.get_login_redirect()

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    try:
        async with google_sso:
            user_info = await google_sso.verify_and_process(request)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Google SSO Error: {e}", exc_info=True)
        FRONTEND_URL = "http://localhost:5173"
        return RedirectResponse(f"{FRONTEND_URL}/login?error=google_sso_failed")
    
    user = db.query(User).filter(User.email == user_info.email).first()
    if not user:
        random_password = secrets.token_urlsafe(32)
        hashed_password = get_password_hash(random_password)
        name = user_info.display_name or user_info.email
        user = User(name=name, email=user_info.email, password_hash=hashed_password)
        db.add(user)
        db.commit()
        db.refresh(user)
        
    user_session = create_user_session(db, user.id, request)
    access_token = create_access_token(data={"sub": str(user.id), "sid": str(user_session.id)})
    
    FRONTEND_URL = "http://localhost:5173"
    return RedirectResponse(f"{FRONTEND_URL}/?token={access_token}")

github_sso = GithubSSO(
    client_id=settings.GITHUB_CLIENT_ID,
    client_secret=settings.GITHUB_CLIENT_SECRET,
    redirect_uri="http://localhost:8000/api/v1/auth/github/callback",
    allow_insecure_http=True,
    scope=["user:email", "repo"]
)

@router.get("/github/login")
async def github_login():
    async with github_sso:
        return await github_sso.get_login_redirect()

@router.get("/github/callback")
async def github_callback(request: Request, db: Session = Depends(get_db)):
    async with github_sso:
        user_info = await github_sso.verify_and_process(request)
        
    code = request.query_params.get("code")
    github_access_token = None
    if code:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": github_sso.redirect_uri
                },
                headers={"Accept": "application/json"}
            )
            token_data = resp.json()
            github_access_token = token_data.get("access_token")
    
    user = db.query(User).filter(User.email == user_info.email).first()
    if not user:
        random_password = secrets.token_urlsafe(32)
        hashed_password = get_password_hash(random_password)
        name = user_info.display_name or user_info.email or "GitHub User"
        user = User(name=name, email=user_info.email, password_hash=hashed_password, github_access_token=github_access_token)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if github_access_token:
            user.github_access_token = github_access_token
            db.commit()
        
    user_session = create_user_session(db, user.id, request)
    access_token = create_access_token(data={"sub": str(user.id), "sid": str(user_session.id)})
    
    FRONTEND_URL = "http://localhost:5173"
    return RedirectResponse(f"{FRONTEND_URL}/?token={access_token}")

@router.get("/sessions")
async def get_sessions(current_user: User = Depends(get_current_user), current_session: UserSession = Depends(get_current_session), db: Session = Depends(get_db)):
    sessions = db.query(UserSession).filter(UserSession.user_id == current_user.id, UserSession.is_active == True).order_by(UserSession.created_at.desc()).all()
    # On marque la session courante pour que le frontend puisse l'identifier
    current_sid = current_session.id if current_session else None
    return [
        {
            "id": str(s.id), 
            "ip_address": s.ip_address, 
            "user_agent": s.user_agent, 
            "created_at": s.created_at,
            "is_current": s.id == current_sid
        } for s in sessions
    ]

@router.post("/sessions/logout_all")
async def logout_all_sessions(current_user: User = Depends(get_current_user), current_session: UserSession = Depends(get_current_session), db: Session = Depends(get_db)):
    if not current_session:
        raise HTTPException(status_code=400, detail="Session courante introuvable.")
    db.query(UserSession).filter(UserSession.user_id == current_user.id, UserSession.id != current_session.id).update({"is_active": False})
    db.commit()
    return {"message": "Toutes les autres sessions ont été déconnectées."}

class VerifyTotpRequest(BaseModel):
    token: str

@router.post("/mfa/setup")
async def setup_mfa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA is already enabled.")
    
    secret = pyotp.random_base32()
    current_user.mfa_secret = secret
    db.commit()
    
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=current_user.email, issuer_name="TeraSprint")
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    return {"qr_code": f"data:image/png;base64,{qr_base64}", "secret": secret}

@router.post("/mfa/verify")
async def verify_mfa(req: VerifyTotpRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA is already enabled.")
        
    if not current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA setup not initiated.")
        
    totp = pyotp.TOTP(current_user.mfa_secret)
    if totp.verify(req.token):
        current_user.mfa_enabled = True
        db.commit()
        return {"message": "MFA enabled successfully."}
    else:
        raise HTTPException(status_code=400, detail="Code TOTP invalide.")
