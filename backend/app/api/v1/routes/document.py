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

class CollectionRequest(BaseModel):
    collection_name: str

class CollectionResponse(BaseModel):
    collection_name: str
    full_collection_name: str
    created_at: str

@router.post("/documents")
async def upload_document(
    file: UploadFile = File(...),
    collection_name: str = Form(...),
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        result = await document_service.upload_document(file, user_id, collection_name, db)
        return {"message": "Document uploaded successfully"}
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.get("/collections", response_model=List[CollectionResponse])
async def list_collections(
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
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
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.post("/collections")
async def create_collection(
    request: CollectionRequest,
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        full_collection_name = await document_service.create_or_update_collection(
            user_id=user_id,
            collection_name=request.collection_name,
            db=db
        )
        return {"message": f"Collection {request.collection_name} created", "full_collection_name": full_collection_name}
    except Exception as e:
        logger.error(f"Error creating collection: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

@router.delete("/collections/{collection_name}")
async def delete_collection(
    collection_name: str,
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        await document_service.delete_collection(user_id, collection_name, db)
        return {"message": f"Collection {collection_name} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting collection: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")

class RenameCollectionRequest(BaseModel):
    new_name: str

@router.put("/collections/{collection_name}/rename")
async def rename_collection(
    collection_name: str,
    request: RenameCollectionRequest,
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        
        # Find the existing collection
        collection = db.query(UserCollection).filter(
            UserCollection.user_id == user_id,
            UserCollection.collection_name == collection_name
        ).first()
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")
        
        # Check if new name already exists
        existing = db.query(UserCollection).filter(
            UserCollection.user_id == user_id,
            UserCollection.collection_name == request.new_name
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Collection with this name already exists")
        
        # Update the collection name
        collection.collection_name = request.new_name
        collection.full_collection_name = f"{user_id}_{request.new_name}"
        
        db.commit()
        
        return {"message": f"Collection renamed to {request.new_name} successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error renaming collection: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="An internal server error occurred. Please try again later.")
