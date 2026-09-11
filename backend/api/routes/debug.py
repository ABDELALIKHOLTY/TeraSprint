
from fastapi import APIRouter
from services.agents.coding.orchestrator import DevOrchestrator
import traceback

router = APIRouter()

@router.get("/debug_graph")
async def debug_graph():
    try:
        orch = DevOrchestrator()
        state = {
            "kanban_context": {},
            "task_id": "debug",
            "ai_model": "qwen2.5:14b",
            "status": "init"
        }
        config = {"configurable": {"thread_id": "test_1"}}
        generator = orch.app.astream(state, config=config)
        
        events = []
        async for event in generator:
            events.append(str(event))
            
        return {"status": "success", "events": events}
    except Exception as e:
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}

