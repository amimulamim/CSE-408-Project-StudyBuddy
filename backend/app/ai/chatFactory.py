from app.ai.geminiService import GeminiService
from app.ai.baseChatService import BaseChatService

def get_chat_llm(model_name: str = "gemini") -> BaseChatService:
    if model_name == "gemini":
        return GeminiService()
    raise ValueError(f"Unsupported model: {model_name}")
