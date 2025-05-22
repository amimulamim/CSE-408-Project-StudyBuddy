from app.ai.gemini import GeminiAI
from app.ai.base import BaseAI

def get_ai_model(provider: str = "gemini") -> BaseAI:
    if provider == "gemini":
        return GeminiAI()
    raise ValueError(f"Unsupported provider: {provider}")
