from app.ai.base import BaseAI
from typing import List, Tuple

class GeminiAI(BaseAI):
    def chat(self, messages: List[Tuple[str, str]]) -> str:
        # Placeholder logic; later connect with actual Gemini API
        last_user_input = [text for role, text in messages if role == "user"][-1]
        return f"[Gemini AI response to]: {last_user_input}"
