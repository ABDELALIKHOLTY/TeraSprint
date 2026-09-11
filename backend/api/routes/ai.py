# pyrefly: ignore [missing-import]
from fastapi import APIRouter
from services.llm_service import ping_gemini, ping_groq

router = APIRouter(prefix="/ai", tags=["Intelligence Artificielle"])

@router.get("/ping")
async def ping_llms():
    """Fait un ping vers Google Gemini et Groq Llama 3 pour vérifier la configuration."""
    gemini_response = await ping_gemini()
    groq_response = await ping_groq()
    
    return {
        "status": "ok",
        "gemini": gemini_response,
        "groq_llama3": groq_response
    }
