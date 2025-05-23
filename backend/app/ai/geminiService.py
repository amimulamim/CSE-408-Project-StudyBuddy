from app.ai.baseChatService import BaseChatService, AIResponse
import os
import google.generativeai as genai
from google.genai.types import Part
from fastapi import HTTPException
from typing import List, Dict, Any, Union

class GeminiService(BaseChatService):
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = os.getenv("GEMINI_MODEL", "models/gemini-pro")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(self.model_name)

        self.system_instruction = """You are an academic assistant that answers based on files and images provided...
        """
    

    async def send_message(self, current_prompt_parts: List[Union[str, Part]], history: List[Dict[str, Any]]) -> Any:
        
        convo = self.model.start_chat(history=history or [])

        try:
            return await convo.send_message_async(current_prompt_parts)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI communication error: {e}")
