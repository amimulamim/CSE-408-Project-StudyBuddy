from app.ai.baseChatService import BaseChatService, AIResponse
import google.generativeai as genai
import os

class GeminiService(BaseChatService):
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = os.getenv("GEMINI_MODEL", "models/gemini-pro")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(self.model_name)

        self.system_instruction = """You are an academic assistant that answers based on files and images provided...
        """
    
    def send_message(self, contents, files=[]):
        try:
            chat = self.model.start_chat(history=[])
            response = chat.send_message(contents, generation_config={"system_instruction": self.system_instruction})
            return AIResponse(text=response.text, files=[])
        except Exception as e:
            raise RuntimeError(f"GeminiService error: {e}")
