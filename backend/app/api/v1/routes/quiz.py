from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Dict, Any
from app.rag.query_processor import QueryProcessor
from app.auth.firebase_auth import get_current_user
from app.document_upload.document_service import DocumentService
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.quiz_generator.models import Quiz, QuizQuestion, QuizResult, QuestionResult
from app.document_upload.model import UserCollection
import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter()
query_processor = QueryProcessor()
document_service = DocumentService()

class ExamRequest(BaseModel):
    query: str
    num_questions: int
    question_type: str  # Expected: MultipleChoice, ShortAnswer, TrueFalse (also accepts multiple_choice, short_answer, true_false)
    collection_name: str

class EvaluateRequest(BaseModel):
    quiz_id: str
    question_id: str
    student_answer: str
    topic: str
    domain: str

class CompleteQuizRequest(BaseModel):
    topic: str
    domain: str
    feedback: str = None

@router.post("/exams")
async def generate_exam(
    request: ExamRequest,
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        result = await query_processor.generate_exam(
            query=request.query,
            num_questions=request.num_questions,
            question_type=request.question_type,
            user_id=user_id,
            collection_name=request.collection_name,
            db=db
        )
        return result
    except Exception as e:
        logger.error(f"Error generating exam: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate")
async def evaluate_answer(
    request: EvaluateRequest,
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        result = query_processor.exam_generator.evaluate_answer(
            exam_id=request.quiz_id,
            question_id=request.question_id,
            student_answer=request.student_answer,
            user_id=user_id,
            db=db
        )
        return {
            "question_id": result["question_id"],
            "is_correct": result["is_correct"],
            "score": result["score"],
            "explanation": result["explanation"]
        }
    except Exception as e:
        logger.error(f"Error evaluating answer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/exams/{exam_id}")
async def delete_exam(
    exam_id: str,
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        quiz = db.query(Quiz).filter(Quiz.quiz_id == exam_id).first()
        if not quiz:
            raise HTTPException(status_code=404, detail="Exam not found")
        if quiz.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        await query_processor.delete_exam(exam_id, db)
        return {"message": f"Exam {exam_id} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting exam: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/exams/{exam_id}/complete")
async def complete_quiz(
    exam_id: str,
    request: CompleteQuizRequest,
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        quiz = db.query(Quiz).filter(Quiz.quiz_id == exam_id).first()
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        if quiz.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        # Calculate total score from question_results table
        question_results = db.query(QuestionResult).filter(
            QuestionResult.user_id == user_id,
            QuestionResult.quiz_id == exam_id
        ).all()
        if not question_results:
            raise HTTPException(status_code=400, detail="No answers submitted")

        score = sum(res.score for res in question_results)

        # Calculate maximum possible score
        questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == exam_id).all()
        total = sum(q.marks for q in questions)

        # Store in quiz_results
        result = QuizResult(
            id=str(uuid.uuid4()),
            user_id=user_id,
            quiz_id=exam_id,
            score=score,
            total=total,
            feedback=request.feedback,
            topic=request.topic,
            domain=request.domain,
            created_at=datetime.now(timezone.utc)
        )
        db.add(result)
        db.commit()

        logger.info(f"Stored quiz result: score {score}/{total} for quiz {exam_id}")
        return {
            "quiz_id": exam_id,
            "score": score,
            "total": total,
            "message": "Quiz completed successfully"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error completing quiz {exam_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))