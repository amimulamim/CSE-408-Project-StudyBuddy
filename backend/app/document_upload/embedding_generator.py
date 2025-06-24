import google.generativeai as genai
from app.core.config import settings

class EmbeddingGenerator:
    def __init__(self, model_name="models/embedding-001", task_type="RETRIEVAL_DOCUMENT"):
        self.api_key = settings.GEMINI_API_KEY
        if not self.api_key:
            raise ValueError("Missing GEMINI_API_KEY in environment.")
        
        genai.configure(api_key=self.api_key)
        self.model_name = model_name
        self.task_type = task_type

    def get_embedding(self, text: str) -> list[float]:
        try:
            response = genai.embed_content(
                model=self.model_name,
                content=text,
                task_type=self.task_type
            )
            embedding = response.get("embedding")
            if not embedding or not isinstance(embedding, list):
                raise ValueError("Invalid embedding response from Gemini API")
            return embedding
        except Exception as e:
            raise RuntimeError(f"Gemini embedding failed: {e}")