from typing import List, Dict, Any
import logging
from app.quiz_generator.quiz_generator import ExamGenerator
from app.document_upload.document_service import DocumentService
from app.quiz_generator.models import Quiz, QuizQuestion
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timezone


logger = logging.getLogger(__name__)

class QueryProcessor:
    def __init__(self):
        self.exam_generator = ExamGenerator()
        self.document_service = DocumentService()

    async def generate_exam(
        self,
        query: str,
        num_questions: int,
        question_type: str,
        user_id: str,
        collection_name: str,
        db: Session
    ) -> Dict[str, Any]:
        """Generates a quiz based on user query and collection."""
        try:
            # Retrieve relevant documents
            documents = await self.document_service.search_documents(
                query=query,
                user_id=user_id,
                collection_name=collection_name,
                limit=5
            )
            context = "\n".join([doc["content"] for doc in documents])
            if not context:
                logger.warning(f"No relevant documents found for query: {query}")
                raise ValueError("No relevant documents found")

            # Generate questions
            questions = self.exam_generator.generate_questions(
                context=context,
                num_questions=num_questions,
                question_type=question_type
            )

            # Create quiz
            quiz_id = str(uuid.uuid4())
            quiz = Quiz(
                quiz_id=quiz_id,
                user_id=user_id,
                created_at=datetime.now(timezone.utc)
            )
            db.add(quiz)

            # Store questions
            question_list = []
            for q in questions:
                question = QuizQuestion(
                    id=q["question_id"],
                    quiz_id=quiz_id,
                    question_text=q["question"],
                    type=q["type"],
                    options=q["options"] if q["options"] else [],
                    difficulty=q["difficulty"],
                    marks=float(q["marks"]),
                    hints=q["hints"],
                    explanation=q["explanation"],
                    correct_answer=str(q["correct_answer"]),
                    created_at=datetime.now(timezone.utc)
                )
                db.add(question)
                question_list.append({
                    "question_id": q["question_id"],
                    "question": q["question"],
                    "type": q["type"],
                    "options": q["options"],
                    "difficulty": q["difficulty"],
                    "marks": q["marks"],
                    # "hints": q["hints"],
                    # "explanation": q["explanation"]
                })
            db.commit()

            return {
                "quiz_id": quiz_id,
                "questions": question_list
            }
        except Exception as e:
            db.rollback()
            logger.error(f"Error generating quiz: {str(e)}")
            raise Exception(f"Error generating quiz: {str(e)}")

    async def delete_exam(self, exam_id: str, db: Session):
        """Deletes a quiz and its associated questions."""
        try:
            quiz = db.query(Quiz).filter(Quiz.quiz_id == exam_id).first()
            if not quiz:
                raise ValueError(f"Quiz {exam_id} not found")
            db.delete(quiz)
            db.commit()
            logger.info(f"Deleted quiz {exam_id}")
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting quiz: {str(e)}")
            raise Exception(f"Error deleting quiz: {str(e)}")