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
import logging
from datetime import datetime, timedelta
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

async def send_email(to: str, subject: str, html_body: str):
    """Send email via Gmail SMTP, else print OTP to console (dev mode)."""
    smtp_user = settings.SMTP_USER
    smtp_pass = settings.SMTP_PASS
    
    if smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"TeraSprint <{smtp_user}>"
            msg['To'] = to
            msg.attach(MIMEText(html_body, 'html'))
            
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, to, msg.as_string())
            logger.info(f"Email sent via Gmail SMTP to {to}")
            return
        except Exception as e:
            logger.error(f"Gmail SMTP error: {e}")
    
    # Fallback: print OTP to console for local dev
    import re
    otp_match = re.search(r'letter-spacing: 8px[^>]*(\d{6})', html_body)
    otp_code = otp_match.group(1) if otp_match else '??????'
    print(f"\n{'='*60}\n[DEV EMAIL] To: {to} | Subject: {subject}\n>>> OTP CODE: {otp_code} <<<\n{'='*60}\n")

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
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "avatar_url": current_user.avatar_url,
        "saas_email": current_user.saas_email,
        "mfa_enabled": current_user.mfa_enabled,
        "has_groq_key": bool(current_user.api_key_groq),
        "has_openrouter_key": bool(current_user.api_key_openrouter),
        "has_gemini_key": bool(current_user.api_key_gemini),
        "has_github_token": bool(current_user.github_access_token),
        "needs_password_setup": current_user.password_hash.startswith("SSO_NOT_SET_") if current_user.password_hash else False
    }

@router.get("/users")
async def get_all_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retourne la liste de tous les utilisateurs pour l'assignation des tâches."""
    users = db.query(User).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "first_name": u.first_name, "last_name": u.last_name, "avatar_url": u.avatar_url} for u in users]

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

class PasswordUpdate(BaseModel):
    new_password: str
    otp: str

class StandardPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

# In-memory OTP store
otp_store = {}

@router.post("/send-otp")
async def send_otp_auth(current_user: User = Depends(get_current_user)):
    otp_code = str(secrets.randbelow(900000) + 100000)
    otp_store[current_user.email] = {
        "otp": otp_code,
        "expires": datetime.utcnow() + timedelta(minutes=15)
    }
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
      <h2 style="color: #0891b2; margin-bottom: 8px;">Code OTP TeraSprint</h2>
      <p style="color: #374151;">Voici votre code OTP pour modifier votre mot de passe&nbsp;:</p>
      <div style="background: #fff; border: 2px solid #0891b2; border-radius: 8px; text-align: center; padding: 24px; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0891b2;">{otp_code}</span>
      </div>
      <p style="color: #6b7280; font-size: 13px;">Ce code expire dans <strong>15 minutes</strong>. Ne le partagez avec personne.</p>
    </div>
    """
    await send_email(current_user.email, "Votre code OTP TeraSprint", html_body)
    return {"message": "Code OTP envoyé."}

@router.put("/password")
async def update_password(req: PasswordUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = otp_store.get(current_user.email)
    if not record or record["otp"] != req.otp or datetime.utcnow() > record["expires"]:
        raise HTTPException(status_code=400, detail="Code OTP invalide ou expiré.")
        
    if await is_password_pwned(req.new_password):
        raise HTTPException(
            status_code=400, 
            detail="Ce mot de passe est compromis (fuite de données). Veuillez en choisir un autre."
        )
    current_user.password_hash = get_password_hash(req.new_password)
    db.commit()
    del otp_store[current_user.email]
    return {"message": "Mot de passe mis à jour avec succès."}

@router.put("/password/standard")
async def update_password_standard(req: StandardPasswordUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="L'ancien mot de passe est incorrect.")
        
    if await is_password_pwned(req.new_password):
        raise HTTPException(
            status_code=400, 
            detail="Ce mot de passe est compromis (fuite de données). Veuillez en choisir un autre."
        )
    current_user.password_hash = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Mot de passe mis à jour avec succès."}

class SSOPasswordSetup(BaseModel):
    new_password: str

@router.put("/setup-sso-password")
async def setup_sso_password(req: SSOPasswordSetup, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.password_hash or not current_user.password_hash.startswith("SSO_NOT_SET_"):
        raise HTTPException(status_code=400, detail="Mot de passe déjà configuré.")
        
    if await is_password_pwned(req.new_password):
        raise HTTPException(
            status_code=400, 
            detail="Ce mot de passe est compromis (fuite de données). Veuillez en choisir un autre."
        )
    current_user.password_hash = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Mot de passe configuré avec succès."}

class OTPRequest(BaseModel):
    email: str

class OTPVerify(BaseModel):
    email: str
    otp: str

class PasswordReset(BaseModel):
    email: str
    otp: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(req: OTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
    otp_code = str(secrets.randbelow(900000) + 100000)
    otp_store[req.email] = {
        "otp": otp_code,
        "expires": datetime.utcnow() + timedelta(minutes=15)
    }
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
      <h2 style="color: #0891b2; margin-bottom: 8px;">Réinitialisation du mot de passe TeraSprint</h2>
      <p style="color: #374151;">Voici votre code OTP pour réinitialiser votre mot de passe&nbsp;:</p>
      <div style="background: #fff; border: 2px solid #0891b2; border-radius: 8px; text-align: center; padding: 24px; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0891b2;">{otp_code}</span>
      </div>
      <p style="color: #6b7280; font-size: 13px;">Ce code expire dans <strong>15 minutes</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
    </div>
    """
    await send_email(req.email, "Réinitialisation du mot de passe TeraSprint", html_body)
    return {"message": "Code OTP envoyé."}

@router.post("/verify-otp")
async def verify_otp(req: OTPVerify):
    record = otp_store.get(req.email)
    if not record or record["otp"] != req.otp or datetime.utcnow() > record["expires"]:
        raise HTTPException(status_code=400, detail="Code OTP invalide ou expiré.")
    return {"message": "Code OTP valide."}

@router.post("/reset-password")
async def reset_password(req: PasswordReset, db: Session = Depends(get_db)):
    record = otp_store.get(req.email)
    if not record or record["otp"] != req.otp or datetime.utcnow() > record["expires"]:
        raise HTTPException(status_code=400, detail="Code OTP invalide ou expiré.")
        
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
    if await is_password_pwned(req.new_password):
        raise HTTPException(
            status_code=400, 
            detail="Ce mot de passe est compromis (fuite de données). Veuillez en choisir un autre."
        )
        
    user.password_hash = get_password_hash(req.new_password)
    db.commit()
    del otp_store[req.email]
    return {"message": "Mot de passe modifié avec succès."}

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
            hashed_password = "SSO_NOT_SET_" + get_password_hash(random_password)
            name = user_info.display_name or user_info.email
            first_name = user_info.first_name or name.split(' ')[0]
            last_name = user_info.last_name or (name.split(' ')[1] if len(name.split(' ')) > 1 else "")
            avatar_url = user_info.picture
            if avatar_url:
                try:
                    import httpx, uuid
                    from services.storage_service import storage_service
                    with httpx.Client() as client:
                        resp = client.get(avatar_url)
                        if resp.status_code == 200:
                            ext = avatar_url.split('.')[-1] if '.' in avatar_url.split('/')[-1] else 'png'
                            filename = f"oauth-{uuid.uuid4().hex[:8]}.{ext}"
                            avatar_url = storage_service.upload_avatar(resp.content, filename, resp.headers.get("Content-Type", "image/png"))
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Failed to upload avatar: {e}")
            
            saas_email = f"{first_name.lower()}.{last_name.lower()}@terasprint.com" if last_name else f"{first_name.lower()}@terasprint.com"
            
            user = User(
                name=name, 
                email=user_info.email, 
                password_hash=hashed_password,
                first_name=first_name,
                last_name=last_name,
                avatar_url=avatar_url,
                saas_email=saas_email
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        user_session = create_user_session(db, user.id, request)
        access_token = create_access_token(data={"sub": str(user.id), "sid": str(user_session.id)})
        
        FRONTEND_URL = "http://localhost:5173"
        return RedirectResponse(f"{FRONTEND_URL}/?token={access_token}")
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

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
        hashed_password = "SSO_NOT_SET_" + get_password_hash(random_password)
        name = user_info.display_name or user_info.email or "GitHub User"
        first_name = user_info.first_name or name.split(' ')[0]
        last_name = user_info.last_name or (name.split(' ')[1] if len(name.split(' ')) > 1 else "")
        avatar_url = user_info.picture
        if avatar_url:
            try:
                import httpx, uuid
                from services.storage_service import storage_service
                with httpx.Client() as client:
                    resp = client.get(avatar_url)
                    if resp.status_code == 200:
                        ext = avatar_url.split('.')[-1] if '.' in avatar_url.split('/')[-1] else 'png'
                        filename = f"oauth-{uuid.uuid4().hex[:8]}.{ext}"
                        avatar_url = storage_service.upload_avatar(resp.content, filename, resp.headers.get("Content-Type", "image/png"))
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to upload avatar: {e}")
        
        saas_email = f"{first_name.lower()}.{last_name.lower()}@terasprint.com" if last_name else f"{first_name.lower()}@terasprint.com"
        
        user = User(
            name=name, 
            email=user_info.email, 
            password_hash=hashed_password, 
            github_access_token=github_access_token,
            first_name=first_name,
            last_name=last_name,
            avatar_url=avatar_url,
            saas_email=saas_email
        )
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
