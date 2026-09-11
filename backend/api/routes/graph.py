from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any
from services.agents.conception.graph_agent import run_negotiation_graph
from api.routes.auth import get_current_user
from models.user import User

router = APIRouter(prefix="/graph", tags=["Négociation LangGraph"])

class RefineRequest(BaseModel):
    task_id: str
    message: str
    current_task: Dict[str, Any]
    ai_model: str = "qwen2.5:14b"
    chat_history: list[Dict[str, Any]] = []

@router.post("/refine")
async def refine_task(request: RefineRequest, current_user: User = Depends(get_current_user)):
    try:
        updated_task = await run_negotiation_graph(
            user_message=request.message,
            current_task=request.current_task,
            ai_model=request.ai_model,
            groq_api_key=current_user.api_key_groq,
            openrouter_api_key=current_user.api_key_openrouter,
            gemini_api_key=current_user.api_key_gemini,
            chat_history=request.chat_history
        )
        return updated_task
    except Exception as e:
        print(f"Error in refine_task: {e}")
        raise HTTPException(status_code=500, detail=str(e))
