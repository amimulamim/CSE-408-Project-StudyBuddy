from app.ai.baseChatService import BaseChatService, AIResponse
import os
import google.generativeai as genai
from google.genai.types import Part
from fastapi import HTTPException
from typing import List, Dict, Any, Union

class GeminiService(BaseChatService):
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = os.getenv("GEMINI_MODEL", "models/gemini-2.0-flash")
        genai.configure(api_key=api_key)

        self.system_instruction = """You are an academic assistant specialized in physics,chemistry,math,biology and Computer Science. Do not respond to topics other than science,biology and engineering.User may upload files and you should answer based on  the files and images provided....
        """

        self.model = genai.GenerativeModel(
            self.model_name,
            system_instruction=self.system_instruction,
                                           )

    

    async def send_message(self, current_prompt_parts: List[Union[str, Part]], history: List[Dict[str, Any]]) -> Any:
        
        convo = self.model.start_chat(history=history or [])

        try:
            return await convo.send_message_async(current_prompt_parts)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI communication error: {e}")
