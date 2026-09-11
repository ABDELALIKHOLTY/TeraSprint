import os
from openai import OpenAI, AsyncOpenAI
from core.config import settings

def get_llm_client(ai_model: str, groq_api_key: str = None, openrouter_api_key: str = None, gemini_api_key: str = None, async_client: bool = True):
    if ai_model.startswith("openrouter:"):
        base_url = "https://openrouter.ai/api/v1"
        api_key = openrouter_api_key or os.environ.get("OPENROUTER_API_KEY", "")
        actual_model = ai_model.replace("openrouter:", "")
    elif ai_model.startswith("groq:"):
        base_url = "https://api.groq.com/openai/v1"
        api_key = groq_api_key or settings.GROQ_API_KEY
        actual_model = ai_model.replace("groq:", "")
    elif ai_model.startswith("gemini:"):
        base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
        api_key = gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
        actual_model = ai_model.replace("gemini:", "")
    else:
        base_url = "http://host.docker.internal:11434/v1"
        api_key = "ollama"
        actual_model = ai_model
        
    if async_client:
        return AsyncOpenAI(api_key=api_key, base_url=base_url, timeout=300.0, max_retries=1), actual_model
    return OpenAI(api_key=api_key, base_url=base_url, timeout=300.0, max_retries=1), actual_model
