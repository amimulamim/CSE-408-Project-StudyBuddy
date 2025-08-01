from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from pydantic import BaseModel
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

INTERNAL_SERVER_ERROR_MSG = "An internal server error occurred. Please try again later."

router = APIRouter()
query_processor = QueryProcessor()
document_service = DocumentService()

class CollectionRequest(BaseModel):
    collection_name: str

class CollectionResponse(BaseModel):
    collection_name: str
    full_collection_name: str
    created_at: str

class DocumentResponse(BaseModel):
    document_id: str
    document_name: str
    chunks_count: int
    first_chunk: str
    storage_path: Optional[str] = None

@router.post("/documents")
async def upload_document(
    file: UploadFile = File(...),
    collection_name: str = Form(...),
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        await document_service.upload_document(file, user_id, collection_name, db)
        return {"message": "Document uploaded successfully"}
    except ValueError as e:
        # Handle specific validation errors with 400 status
        logger.warning(f"Document upload validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MSG)

@router.get("/collections", response_model=List[CollectionResponse])
async def list_collections(
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user),
    start_date: Optional[str] = Query(None, description="Start date filter (ISO format: YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (ISO format: YYYY-MM-DD)")
):
    try:
        user_id = user_info["uid"]
        query = db.query(UserCollection).filter(UserCollection.user_id == user_id)
        
        # Apply date range filtering
        if start_date:
            try:
                start_date_obj = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
                query = query.filter(UserCollection.created_at >= start_date_obj)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
        
        if end_date:
            try:
                end_date_obj = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
                query = query.filter(UserCollection.created_at <= end_date_obj)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
        
        collections = query.order_by(UserCollection.created_at.desc()).all()
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
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MSG)

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
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MSG)

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
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MSG)

@router.get("/collections/{collection_name}/documents", response_model=List[DocumentResponse])
async def list_documents_in_collection(
    collection_name: str,
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        documents = document_service.list_documents_in_collection(user_id, collection_name, db)
        return documents
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error listing documents in collection: {str(e)}")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MSG)

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
        success = document_service.rename_collection_with_migration(
            user_id, collection_name, request.new_name, db
        )
        if success:
            return {"message": f"Collection renamed to {request.new_name} successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to rename collection")
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error renaming collection: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MSG)

class RenameDocumentRequest(BaseModel):
    new_name: str

@router.put("/collections/{collection_name}/documents/{document_id}/rename")
async def rename_document(
    collection_name: str,
    document_id: str,
    request: RenameDocumentRequest,
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        success = document_service.rename_document(user_id, collection_name, document_id, request.new_name, db)
        if success:
            return {"message": f"Document renamed to {request.new_name} successfully"}
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error renaming document: {str(e)}")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MSG)

@router.get("/collections/{collection_name}/documents/{document_id}/content")
async def get_document_content_url(
    collection_name: str,
    document_id: str,
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        download_url = document_service.get_document_content_url(user_id, collection_name, document_id, db)
        return {"download_url": download_url}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting document content URL: {str(e)}")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MSG)

@router.delete("/collections/{collection_name}/documents/{document_id}")
async def delete_document(
    collection_name: str,
    document_id: str,
    db: Session = Depends(get_db),
    user_info: Dict[str, Any] = Depends(get_current_user)
):
    try:
        user_id = user_info["uid"]
        logger.info(f"Attempting to delete document {document_id} from collection {collection_name} for user {user_id}")
        success = document_service.delete_document(user_id, collection_name, document_id, db)
        if success:
            return {"message": "Document deleted successfully"}
        else:
            logger.warning(f"Delete operation returned False for document {document_id}")
            raise HTTPException(status_code=404, detail="Document not found")
    except ValueError as e:
        logger.warning(f"ValueError in delete_document: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Exception in delete_document: {str(e)}")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_MSG)
