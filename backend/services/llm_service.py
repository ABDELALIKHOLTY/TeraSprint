from openai import OpenAI, AsyncOpenAI
from core.config import settings

OLLAMA_BASE_URL = "http://host.docker.internal:11434/v1"

try:
    groq_client = OpenAI(base_url=OLLAMA_BASE_URL, api_key="ollama", timeout=None)
    async_groq_client = AsyncOpenAI(base_url=OLLAMA_BASE_URL, api_key="ollama", timeout=None)
except Exception as e:
    groq_client = None
    async_groq_client = None
    print(f"Erreur d'initialisation du client Ollama: {e}")

async def ping_gemini():
    """Vérifie que l'API Gemini répond bien."""
    if not gemini_model:
        return "Clé Gemini non configurée"
    try:
        response = gemini_model.generate_content("Dis bonjour de la part de TeraSprint en 5 mots.")
        return response.text
    except Exception as e:
        return f"Erreur Gemini: {str(e)}"

async def ping_groq():
    """Vérifie que l'API Ollama locale répond bien."""
    if not groq_client:
        return "Client Ollama non configuré"
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": "Dis bonjour de la part de TeraSprint en 5 mots."}],
            model="qwen2.5:14b",
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        return f"Erreur Ollama: {str(e)}"
