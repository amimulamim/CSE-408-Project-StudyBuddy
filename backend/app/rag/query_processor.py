import os
import uuid
import PyPDF2
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http import models
import hashlib
from dotenv import load_dotenv
from PIL import Image
import io
import logging
from app.core.vector_db import VectorDatabaseManager
from app.generator.quiz_generator import ExamGenerator
import google.generativeai as genai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()
class QueryProcessor:
    """Orchestrates query processing and exam generation pipeline."""
    
    def __init__(self):
        self.vector_db = VectorDatabaseManager(
            qdrant_url=os.getenv("QDRANT_HOST"),
            qdrant_api_key=os.getenv("QDRANT_API_KEY"),
            collection_name=os.getenv("QDRANT_COLLECTION_NAME")
        )
        self.exam_generator = ExamGenerator(os.getenv("GEMINI_API_KEY"))
        self.embedding_api_key = os.getenv("GEMINI_API_KEY")
    
    def generate_query_embedding(self, query: str) -> List[float]:
        """Generates query embedding using Gemini API."""
        try:
            result = genai.embed_content(
                model="models/embedding-001",
                content=query,
                task_type="SEMANTIC_SIMILARITY"
            )
            embedding = result.get('embedding')
            if not embedding or not isinstance(embedding, list):
                raise ValueError("Invalid embedding response from Gemini API")
            return embedding
        except Exception as e:
            logger.error(f"Error generating query embedding: {str(e)}")
            raise Exception(f"Error generating query embedding: {str(e)}")
    
    def generate_exam(self, query: str, num_questions: int, question_type: str) -> Dict[str, Any]:
        """Generates an exam based on a user query."""
        try:
            query_embedding = self.generate_query_embedding(query)
            search_results = self.vector_db.search_vectors(query_embedding)
            if not search_results:
                raise ValueError("No relevant documents found for the query")
            context = "\n".join([result["text"] for result in search_results])
            exam = self.exam_generator.generate_questions(context, num_questions, question_type)
            return exam
        except Exception as e:
            raise Exception(f"Error generating exam: {str(e)}")