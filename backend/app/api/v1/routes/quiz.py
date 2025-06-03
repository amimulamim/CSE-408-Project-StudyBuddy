import os
import logging
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from dotenv import load_dotenv
from app.core.vector_db import VectorDatabaseManager
from app.rag.document_processor import DocumentProcessor
from app.rag.query_processor import QueryProcessor
from fastapi import APIRouter, Depends, HTTPException,  Form, UploadFile, File , Query, Path,Body


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

router = APIRouter()

# Pydantic models for request validation
class CreateCollectionRequest(BaseModel):
    collection_name: str

class GenerateExamRequest(BaseModel):
    query: str
    num_questions: int
    question_type: str

# API endpoints
@router.post("/collections")
async def create_collection(request: CreateCollectionRequest):
    """Creates a new Qdrant collection."""
    try:
        vector_db = VectorDatabaseManager(
            qdrant_url=os.getenv("QDRANT_HOST"),
            qdrant_api_key=os.getenv("QDRANT_API_KEY"),
            collection_name=request.collection_name
        )
        result = vector_db.create_collection()
        return result
    except Exception as e:
        logger.error(f"Error creating collection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/collections/{collection_name}")
async def delete_collection(collection_name: str):
    """Deletes a Qdrant collection."""
    try:
        vector_db = VectorDatabaseManager(
            qdrant_url=os.getenv("QDRANT_HOST"),
            qdrant_api_key=os.getenv("QDRANT_API_KEY"),
            collection_name=collection_name
        )
        result = vector_db.delete_collection()
        return result
    except Exception as e:
        logger.error(f"Error deleting collection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/collections")
async def list_collections():
    """Lists all Qdrant collections."""
    try:
        vector_db = VectorDatabaseManager(
            qdrant_url=os.getenv("QDRANT_HOST"),
            qdrant_api_key=os.getenv("QDRANT_API_KEY"),
            collection_name="dummy"  # Dummy name, not used
        )
        collections = vector_db.list_collections()
        return {"collections": collections}
    except Exception as e:
        logger.error(f"Error listing collections: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents")
async def process_document(file: UploadFile = File(...)):
    """Processes an uploaded document and stores it in Qdrant."""
    try:
        if not file.filename.endswith(('.pdf', '.txt')):
            raise HTTPException(status_code=400, detail="Unsupported file format. Use .pdf or .txt")
        
        # Save uploaded file temporarily
        temp_file_path = f"/tmp/{file.filename}"
        with open(temp_file_path, "wb") as temp_file:
            temp_file.write(await file.read())
        
        # Process document
        doc_processor = DocumentProcessor()
        document_id = doc_processor.process_document(temp_file_path)
        
        # Clean up temporary file
        os.remove(temp_file_path)
        
        logger.info(f"Processed document {file.filename} with ID: {document_id}")
        return {"document_id": document_id, "message": f"Document {file.filename} processed successfully"}
    except Exception as e:
        logger.error(f"Error processing document {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exams")
async def generate_exam(request: GenerateExamRequest):
    """Generates an exam based on a user query."""
    try:
        query_processor = QueryProcessor()
        exam = query_processor.generate_exam(
            query=request.query,
            num_questions=request.num_questions,
            question_type=request.question_type
        )
        logger.info(f"Generated exam for query: {request.query}")
        return exam
    except Exception as e:
        logger.error(f"Error generating exam: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(router, host="0.0.0.0", port=8000)