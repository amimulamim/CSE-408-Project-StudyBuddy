from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel , Field
from typing import List, Dict, Any, Optional
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

# Initialize services lazily to avoid issues during testing
_query_processor = None
_document_service = None

def get_query_processor():
    global _query_processor
    if _query_processor is None:
        _query_processor = QueryProcessor()
    return _query_processor

def get_document_service():
    global _document_service
    if _document_service is None:
        _document_service = DocumentService()
    return _document_service

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
    feedback: Optional[str] = None
class BulkAnswer(BaseModel):
    question_id: str = Field(..., description="The UUID of the question")
    student_answer: str = Field(..., description="The student's answer")

class BulkEvaluateRequest(BaseModel):
    quiz_id: str
    answers: List[BulkAnswer] 


@router.post("/quiz")
async def generate_exam(
    request: ExamRequest,
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        result = await get_query_processor().generate_exam(
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
        result = get_query_processor().exam_generator.evaluate_answer(
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

@router.delete("/quizzes/{quiz_id}")
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
        await get_query_processor().delete_exam(exam_id, db)
        return {"message": f"Exam {exam_id} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting exam: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# evaluate before submitting
@router.post("/quizzes/{quiz_id}/submit")
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
    
@router.get("/quizzes/{quiz_id}", response_model=Dict[str, Any])
async def get_quiz(
    quiz_id: str,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches a previously generated quiz by quiz_id for the user."""
    try:
        # First check if the quiz exists and belongs to the user
        quiz_record = db.query(Quiz).filter(
            Quiz.quiz_id == quiz_id,
            Quiz.user_id == user_info["uid"]
        ).first()
        if not quiz_record:
            raise HTTPException(status_code=404, detail="Quiz not found or not accessible")
        
        # Then fetch the questions for this quiz
        questions_data = db.query(QuizQuestion).filter(
            QuizQuestion.quiz_id == quiz_id
        ).all()
        if not questions_data:
            raise HTTPException(status_code=404, detail="No questions found for this quiz")
        
        questions = [
            {
                "question_id": q.id,
                "question": q.question_text,
                "type": q.type,
                "options": q.options,
                "difficulty": q.difficulty,
                "marks": q.marks,
                "hints": q.hints
            }
            for q in questions_data
        ]
        
        return {
            "quiz_id": quiz_id,
            "questions": questions
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quiz {quiz_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quizzes/{quiz_id}/result", response_model=Dict[str, Any])
async def get_quiz_result(
    quiz_id: str,
    user_info: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches the result of a quiz by quiz_id for the user."""
    try:
        quiz_result = db.query(QuizResult).filter(
            QuizResult.quiz_id == quiz_id,
            QuizResult.user_id == user_info["uid"]
        ).first()
        if not quiz_result:
            raise HTTPException(status_code=404, detail="Quiz result not found or not accessible")
        
        question_results = db.query(QuestionResult).filter(
            QuestionResult.quiz_id == quiz_id,
            QuestionResult.user_id == user_info["uid"]
        ).all()
        
        return {
            "quiz_id": quiz_id,
            "score": quiz_result.score,
            "total": quiz_result.total,
            "topic": quiz_result.topic,
            "domain": quiz_result.domain,
            "feedback": quiz_result.feedback,
            "question_results": [
                {
                    "question_id": qr.question_id,
                    "score": qr.score,
                    "is_correct": qr.is_correct,
                    "student_answer": qr.student_answer
                }
                for qr in question_results
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quiz result {quiz_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/quizzes/{quiz_id}/evaluate_all", response_model=Dict[str, Any])
async def evaluate_all_answers(
    quiz_id: str,
    request: BulkEvaluateRequest,
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    """
    Evaluates all answers for a quiz and returns results, correct answers, and overall quiz result.
    Prevents users from submitting the same quiz twice.
    """
    try:
        user_id = user_info["uid"]

        # Check if user already has a result for this quiz
        existing_result = db.query(QuizResult).filter(
            QuizResult.quiz_id == quiz_id,
            QuizResult.user_id == user_id
        ).first()
        if existing_result:
            raise HTTPException(
                status_code=400,
                detail="You have already submitted this quiz. Multiple submissions are not allowed."
            )

        # Fetch all questions for the quiz
        questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
        question_map = {str(q.id): q for q in questions}
        results = []
        correct_answers = []

        from app.quiz_generator.quiz_generator import ExamGenerator
        exam_generator = ExamGenerator()

        total_score = 0.0
        total_marks = 0.0

        for ans in request.answers:
            qid = ans.question_id
            student_answer = ans.student_answer
            question = question_map.get(qid)
            if not question:
                continue
            eval_result = exam_generator.evaluate_answer(
                exam_id=quiz_id,
                question_id=qid,
                student_answer=student_answer,
                user_id=user_id,
                db=db
            )
            results.append({
                "question_id": qid,
                "is_correct": eval_result["is_correct"],
                "score": eval_result["score"],
                "explanation": eval_result["explanation"]
            })
            correct_answers.append({
                "question_id": qid,
                "correct_answer": question.correct_answer,
                "options": question.options,
                "type": question.type.value if hasattr(question.type, "value") else str(question.type)
            })
            total_score += eval_result["score"]
            total_marks += question.marks

        # Optionally fetch topic/domain/feedback from Quiz or QuizResult if needed
        quiz = db.query(Quiz).filter(Quiz.quiz_id == quiz_id).first()
        quiz_result = db.query(QuizResult).filter(
            QuizResult.quiz_id == quiz_id,
            QuizResult.user_id == user_id
        ).first()

        # Store the quiz result to prevent double submissions
        quiz_result = QuizResult(
            id=str(uuid.uuid4()),
            user_id=user_id,
            quiz_id=quiz_id,
            score=total_score,
            total=total_marks,
            feedback="",
            topic=(getattr(quiz, "topic", "") if quiz and getattr(quiz, "topic", None) is not None else ""),
            domain=(getattr(quiz, "domain", "") if quiz and getattr(quiz, "domain", None) is not None else ""),
            created_at=datetime.now(timezone.utc)
        )
        db.add(quiz_result)
        db.commit()

        return {
            "quiz_id": quiz_id,
            "score": total_score,
            "total": total_marks,
            "topic": getattr(quiz_result, "topic", None) if quiz_result else None,
            "domain": getattr(quiz_result, "domain", None) if quiz_result else None,
            "feedback": getattr(quiz_result, "feedback", None) if quiz_result else None,
            "question_results": results,
            "correct_answers": correct_answers
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error in bulk evaluation for quiz {quiz_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))