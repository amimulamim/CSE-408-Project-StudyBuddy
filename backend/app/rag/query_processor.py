import os
import uuid
import json
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.generator.models import Quiz, QuizQuestion
from app.core.vector_db import VectorDatabaseManager
import google.generativeai as genai

logger = logging.getLogger(__name__)



        
class QueryProcessor:
    """Orchestrates query processing, exam generation, and storage."""
    def __init__(self):
        self.vector_db = VectorDatabaseManager(
            qdrant_url=os.getenv("QDRANT_HOST"),
            qdrant_api_key=os.getenv("QDRANT_API_KEY"),
            collection_name=os.getenv("QDRANT_COLLECTION_NAME")
        )
        self.exam_generator = ExamGenerator(os.getenv("GEMINI_API_KEY"))
        self.embedding_api_key = os.getenv("GEMINI_API_KEY")
        self.exams_storage = {}  # In-memory storage: {exam_id: {questions: {question_id: question}}}
    
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
        """Generates an exam and stores it server-side."""
        try:
            query_embedding = self.generate_query_embedding(query)
            search_results = self.vector_db.search_vectors(query_embedding)
            if not search_results:
                raise ValueError("No relevant documents found for the query")
            context = "\n".join([result["text"] for result in search_results])
            questions = self.exam_generator.generate_questions(context, num_questions, question_type)
            
            # Store exam server-side
            exam_id = str(uuid.uuid4())
            stored_questions = {q["question_id"]: q for q in questions}
            self.exams_storage[exam_id] = {"questions": stored_questions}
            
            # Prepare frontend response (exclude correct_answer)
            frontend_questions = [
                {
                    "type": q["type"],
                    "question": q["question"],
                    "question_id": q["question_id"],
                    "options": q.get("options", [])
                }
                for q in questions
            ]
            
            return {"exam_id": exam_id, "questions": frontend_questions}
        except Exception as e:
            logger.error(f"Error generating exam: {str(e)}")
            raise Exception(f"Error generating exam: {str(e)}")