import uuid
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.quiz_generator.models import Quiz, QuizQuestion
from app.core.vector_db import VectorDatabaseManager
from app.quiz_generator.quiz_generator import ExamGenerator
from app.core.config import settings
import google.generativeai as genai

logger = logging.getLogger(__name__)

class QueryProcessor:
    """Orchestrates query processing, exam generation, and storage."""
    def __init__(self):
        self.vector_db = VectorDatabaseManager(
            qdrant_url=settings.QDRANT_HOST,
            qdrant_api_key=settings.QDRANT_API_KEY,
            collection_name=settings.QDRANT_COLLECTION_NAME)
        self.exam_generator = ExamGenerator()
        self.embedding_api_key = settings.GEMINI_API_KEY
        self.embedding_model = settings.QUERY_EMBEDDING_MODEL

    async def generate_query_embedding(self, query: str) -> List[float]:
        """Generates query embedding using Gemini API."""
        try:
            genai.configure(api_key=self.embedding_api_key)
            result = genai.embed_content(
                model=self.embedding_model,
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

    async def generate_exam(self, query: str, num_questions: int, question_type: str, user_id: str, db: Session) -> Dict[str, Any]:
        """Generates a quiz based on user query and stores it in PostgreSQL."""
        try:
            query_embedding = await self.generate_query_embedding(query)
            search_results = self.vector_db.search_vectors(query_embedding)
            if not search_results:
                raise ValueError("No relevant documents found for the query")
            context = "\n".join([result["text"] for result in search_results])
            questions = self.exam_generator.generate_questions(context, num_questions, question_type)
            
            quiz_id = str(uuid.uuid4())
            quiz = Quiz(quiz_id=quiz_id, user_id=user_id)
            db.add(quiz)
            
            for q in questions:
                question = QuizQuestion(
                    id=q["question_id"],
                    quiz_id=quiz_id,
                    question_text=q["question"],
                    options=q["options"],
                    type=q["type"],
                    difficulty=q["difficulty"],
                    marks=q["marks"],
                    hints=q["hints"],
                    explanation=q["explanation"],
                    correct_answer=q["correct_answer"]
                )
                db.add(question)
            db.commit()
            logger.debug(f"Stored quiz {quiz_id} with {len(questions)} questions in PostgreSQL")
            
            frontend_questions = [
                {
                    "type": q["type"],
                    "question": q["question"],
                    "question_id": q["question_id"],
                    "options": q.get("options", []),
                    "difficulty": q["difficulty"],
                    "marks": q["marks"]
                }
                for q in questions
            ]
            
            return {"quiz_id": quiz_id, "questions": frontend_questions}
        except Exception as e:
            db.rollback()
            logger.error(f"Error generating quiz: {str(e)}")
            raise Exception(f"Error generating quiz: {str(e)}")

    async def delete_exam(self, quiz_id: str, db: Session) -> None:
        """Deletes a quiz and its associated questions from PostgreSQL."""
        try:
            quiz = db.query(Quiz).filter(Quiz.quiz_id == quiz_id).first()
            if quiz:
                db.delete(quiz)
                db.commit()
            logger.debug(f"Deleted quiz {quiz_id} from PostgreSQL")
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting quiz {quiz_id}: {str(e)}")
            raise Exception(f"Error deleting quiz: {str(e)}")