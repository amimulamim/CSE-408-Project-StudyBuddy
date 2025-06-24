import uuid
import logging
import os
from unittest.mock import MagicMock
from fastapi import UploadFile, HTTPException
from firebase_admin import storage
from sqlalchemy.orm import Session
from app.core.config import settings
from app.document_upload.document_converter import DocumentConverter
from app.document_upload.text_chunker import TextChunker
from app.document_upload.embedding_generator import EmbeddingGenerator
from app.core.vector_db import VectorDatabaseManager
from app.document_upload.model import UserCollection
from typing import List, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class DocumentService:
    """Handles document upload, storage, retrieval, and Qdrant collection management."""
    def __init__(self):
        try:
            self.converter = DocumentConverter()
            self.chunker = TextChunker(chunk_size=1000, overlap=200)
            self.embedding_generator = EmbeddingGenerator(model_name="models/embedding-001", task_type="RETRIEVAL_DOCUMENT")
            
            # Handle testing environment
            if os.getenv("TESTING"):
                self.bucket = MagicMock()
            else:
                self.bucket = storage.bucket(settings.FIREBASE_STORAGE_BUCKET)
            logger.debug("Initialized DocumentService successfully")
        except Exception as e:
            logger.error(f"Error initializing DocumentService: {str(e)}")
            raise

    async def create_or_update_collection(self, user_id: str, collection_name: str, db: Session) -> str:
        """Creates or updates a Qdrant collection and stores metadata in PostgreSQL."""
        full_collection_name = f"{user_id}_{collection_name}"
        try:
            if not collection_name or len(collection_name) > 50 or not collection_name.isalnum():
                raise ValueError("Invalid collection name. Use alphanumeric characters, max 50.")
            existing = db.query(UserCollection).filter(
                UserCollection.user_id == user_id,
                UserCollection.collection_name == collection_name
            ).first()
            if not existing:
                vector_db = VectorDatabaseManager(
                    qdrant_url=settings.QDRANT_HOST,
                    qdrant_api_key=settings.QDRANT_API_KEY,
                    collection_name=full_collection_name
                )
                vector_db.create_collection()
                collection = UserCollection(
                    user_id=user_id,
                    collection_name=collection_name,
                    full_collection_name=full_collection_name,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(collection)
                db.commit()
                logger.debug(f"Created collection {full_collection_name} for user {user_id}")
            return full_collection_name
        except Exception as e:
            db.rollback()
            logger.error(f"Error managing Qdrant collection {full_collection_name}: {str(e)}")
            raise Exception(f"Error managing Qdrant collection: {str(e)}")

    async def delete_collection(self, user_id: str, collection_name: str, db: Session) -> None:
        """Deletes a Qdrant collection and its metadata from PostgreSQL."""
        full_collection_name = f"{user_id}_{collection_name}"
        try:
            collection = db.query(UserCollection).filter(
                UserCollection.user_id == user_id,
                UserCollection.collection_name == collection_name
            ).first()
            if not collection:
                raise HTTPException(status_code=404, detail=f"Collection {collection_name} not found")
            vector_db = VectorDatabaseManager(
                qdrant_url=settings.QDRANT_HOST,
                qdrant_api_key=settings.QDRANT_API_KEY,
                collection_name=full_collection_name
            )
            vector_db.delete_collection()
            db.delete(collection)
            db.commit()
            logger.debug(f"Deleted collection {full_collection_name} for user {user_id}")
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting Qdrant collection {full_collection_name}: {str(e)}")
            raise Exception(f"Error deleting Qdrant collection: {str(e)}")

    async def upload_document(self, file: UploadFile, user_id: str, collection_name: str, db: Session) -> dict:
        """Uploads document to Firebase Storage and stores embeddings in Qdrant."""
        try:
            allowed_types = {"application/pdf", "text/plain"}
            if file.content_type not in allowed_types:
                raise ValueError(f"Unsupported file type: {file.content_type}")
            file_extension = file.filename.split(".")[-1]
            storage_path = f"documents/{user_id}/{uuid.uuid4()}.{file_extension}"
            blob = self.bucket.blob(storage_path)
            content = await file.read()
            blob.upload_from_string(content, content_type=file.content_type)
            logger.debug(f"Uploaded file {file.filename} to {storage_path}")
            full_collection_name = await self.create_or_update_collection(user_id, collection_name, db)
            vector_db = VectorDatabaseManager(
                qdrant_url=settings.QDRANT_HOST,
                qdrant_api_key=settings.QDRANT_API_KEY,
                collection_name=full_collection_name
            )
            text = self.converter.extract_text(content, file.content_type)
            if not text:
                raise ValueError("No text extracted from document")
            chunks = self.chunker.chunk_text(text)
            if not chunks:
                raise ValueError("No chunks generated from document text")
            document_id = str(uuid.uuid4())
            embeddings = [self.embedding_generator.get_embedding(chunk) for chunk in chunks]
            vector_db.upsert_vectors(document_id, chunks, embeddings)
            logger.debug(f"Stored {len(chunks)} embeddings for document {document_id} in {full_collection_name}")
            return {
                "document_id": document_id,
                "file_name": file.filename,
                "file_type": file.content_type,
                "storage_path": storage_path,
                "collection_name": collection_name
            }
        except Exception as e:
            db.rollback()
            logger.error(f"Error uploading document: {str(e)}")
            raise Exception(f"Error uploading document: {str(e)}")

    async def search_documents(self, query: str, user_id: str, collection_name: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Searches for relevant documents in a user's Qdrant collection."""
        try:
            full_collection_name = f"{user_id}_{collection_name}"
            vector_db = VectorDatabaseManager(
                qdrant_url=settings.QDRANT_HOST,
                qdrant_api_key=settings.QDRANT_API_KEY,
                collection_name=full_collection_name
            )
            query_embedding = self.embedding_generator.get_embedding(query)
            search_results = vector_db.search_vectors(query_embedding, limit=limit)
            documents = [
                {
                    "content": result["text"],
                    "score": result["score"],
                    "point_id": result["document_id"]
                }
                for result in search_results
            ]
            logger.debug(f"Found {len(documents)} documents for query in {full_collection_name}")
            return documents
        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            raise Exception(f"Error searching documents: {str(e)}")