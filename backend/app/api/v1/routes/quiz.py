from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Any, List
from app.rag.query_processor import QueryProcessor
from app.auth.firebase_auth import get_current_user
from app.document_upload.document_service import DocumentService
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.document_upload.model import UserCollection
from app.quiz_generator.models import *
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
query_processor = QueryProcessor()
document_service = DocumentService()

class ExamRequest(BaseModel):
    query: str
    num_questions: int
    question_type: str
    collection_name: str

class EvaluateRequest(BaseModel):
    quiz_id: str
    question_id: str
    student_answer: Any
    topic: str
    domain: str

class CollectionRequest(BaseModel):
    collection_name: str

class CollectionResponse(BaseModel):
    collection_name: str
    full_collection_name: str
    created_at: str

@router.post("/exams")
async def generate_exam(
    request: ExamRequest,
    db: Session = Depends(get_db),
    user_info: dict = Depends(get_current_user)
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
    user_info: dict = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        result = query_processor.exam_generator.evaluate_answer(
            exam_id=request.quiz_id,
            question_id=request.question_id,
            student_answer=request.student_answer,
            db=db
        )
        return result
    except Exception as e:
        logger.error(f"Error evaluating answer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/exams/{quiz_id}")
async def delete_exam(
    quiz_id: str,
    db: Session = Depends(get_db),
    user_info: dict = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        # from app.models import Quiz
        quiz = db.query(Quiz).filter(Quiz.quiz_id == quiz_id).first()
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        if quiz.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this quiz")
        await query_processor.delete_exam(quiz_id, db)
        return {"message": f"Quiz {quiz_id} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting exam: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents")
async def upload_document(
    file: UploadFile = File(...),
    collection_name: str = Form(...),
    db: Session = Depends(get_db),
    user_info: dict = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        result = await document_service.upload_document(file, user_id, collection_name, db)
        return result
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/collections", response_model=List[CollectionResponse])
async def list_collections(
    db: Session = Depends(get_db),
    user_info: dict = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        collections = db.query(UserCollection).filter(UserCollection.user_id == user_id).all()
        return [
            {
                "collection_name": col.collection_name,
                "full_collection_name": col.full_collection_name,
                "created_at": col.created_at.isoformat()
            }
            for col in collections
        ]
    except Exception as e:
        logger.error(f"Error listing collections: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/collections")
async def create_collection(
    request: CollectionRequest,
    db: Session = Depends(get_db),
    user_info: dict = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        full_collection_name = await document_service.create_or_update_collection(
            user_id=user_id,
            collection_name=request.collection_name,
            db=db
        )
        return {"message": f"Collection {request.collection_name} created successfully", "full_collection_name": full_collection_name}
    except Exception as e:
        logger.error(f"Error creating collection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/collections/{collection_name}")
async def delete_collection(
    collection_name: str,
    db: Session = Depends(get_db),
    user_info: dict = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        await document_service.delete_collection(user_id, collection_name, db)
        return {"message": f"Collection {collection_name} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting collection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))