import google.generativeai as genai
import re
from app.core.config import settings

class EmbeddingGenerator:
    def __init__(self, model_name="models/embedding-001", task_type="RETRIEVAL_DOCUMENT"):
        self.api_key = settings.GEMINI_API_KEY
        if not self.api_key:
            raise ValueError("Missing GEMINI_API_KEY in environment.")
        
        genai.configure(api_key=self.api_key)
        self.model_name = model_name
        self.task_type = task_type

    def _sanitize_text(self, text: str) -> str:
        """Sanitize text to ensure it's safe for API calls."""
        if not text:
            return text
            
        try:
            # Ensure text is properly encoded
            text = text.encode('utf-8', errors='ignore').decode('utf-8')
            
            # Remove Unicode surrogate characters
            text = re.sub(r'[\ud800-\udfff]', '', text)
            
            # Remove replacement characters
            text = text.replace('\ufffd', '')
            
            # Normalize whitespace
            text = ' '.join(text.split())
            
            return text
        except Exception:
            # If sanitization fails, return original text
            return text

    def get_embedding(self, text: str) -> list[float]:
        try:
            # Sanitize text before sending to API
            sanitized_text = self._sanitize_text(text)
            
            if not sanitized_text.strip():
                raise ValueError("Text is empty after sanitization")
            
            response = genai.embed_content(
                model=self.model_name,
                content=sanitized_text,
                task_type=self.task_type
            )
            embedding = response.get("embedding")
            if not embedding or not isinstance(embedding, list):
                raise ValueError("Invalid embedding response from Gemini API")
            return embedding
        except Exception as e:
            raise RuntimeError(f"Gemini embedding failed: {e}")