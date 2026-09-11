import sys
sys.path.append("backend")
import asyncio
import os
import json
from services.agents.coding.orchestrator import DevOrchestrator

async def test():
    try:
        print("Initializing DevOrchestrator...", flush=True)
        orch = DevOrchestrator()
        state = {
            "kanban_context": {},
            "task_id": "test_task",
            "ai_model": "llama3.1",
            "status": "init"
        }
        config = {"configurable": {"thread_id": "test_1"}}
        print("Starting astream...", flush=True)
        generator = orch.app.astream(state, config=config)
        async for event in generator:
            print("Event:", event, flush=True)
        print("Done!", flush=True)
    except Exception as e:
        print("Exception:", e, flush=True)
        import traceback
        traceback.print_exc()

asyncio.run(test())
