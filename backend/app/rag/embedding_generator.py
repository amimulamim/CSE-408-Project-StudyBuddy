import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini API
if not os.getenv("GEMINI_API_KEY"):
    raise ValueError("GEMINI_API_KEY not set in .env file")

class EmbeddingGenerator:
    def __init__(self, model_name="models/embedding-001", task_type="RETRIEVAL_DOCUMENT"):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("Missing GEMINI_API_KEY in environment.")

        # genai.configure(api_key=self.api_key)
        
        self.model = genai.get_embedding_model(model_name=model_name)
        self.task_type = task_type

    def get_embedding(self, text: str) -> list[float]:
        try:
            response = self.model.embed_content(
                content=text,
                task_type=self.task_type,
                title="Document Chunk"
            )
            return response["embedding"]
        except Exception as e:
            raise RuntimeError(f"Gemini embedding failed: {e}")
