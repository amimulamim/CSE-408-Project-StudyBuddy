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
            if not collection_name or len(collection_name) > 50:
                raise ValueError("Invalid collection name. Max 50 characters allowed.")
            
            # Check if collection already exists first
            existing = db.query(UserCollection).filter(
                UserCollection.user_id == user_id,
                UserCollection.collection_name == collection_name
            ).first()
            
            # Only apply strict validation for new collections
            if not existing:
                # Allow alphanumeric, underscore, hyphen, and space characters for new collections
                import re
                if not re.match(r'^[a-zA-Z0-9_\- ]+$', collection_name):
                    raise ValueError("Invalid collection name. Use alphanumeric characters, spaces, underscores, and hyphens only.")
            
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
            vector_db.upsert_vectors(document_id, chunks, embeddings, file.filename, storage_path)
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

    def list_documents_in_collection(self, user_id: str, collection_name: str, db: Session) -> List[Dict[str, Any]]:
        """Lists all documents in a user's collection."""
        try:
            # Verify collection exists
            collection = db.query(UserCollection).filter(
                UserCollection.user_id == user_id,
                UserCollection.collection_name == collection_name
            ).first()
            
            if not collection:
                raise ValueError(f"Collection {collection_name} not found")
            
            full_collection_name = f"{user_id}_{collection_name}"
            vector_db = VectorDatabaseManager(
                qdrant_url=settings.QDRANT_HOST,
                qdrant_api_key=settings.QDRANT_API_KEY,
                collection_name=full_collection_name
            )
            
            documents = vector_db.list_documents()
            logger.debug(f"Listed {len(documents)} documents in collection {full_collection_name}")
            return documents
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Error listing documents in collection: {str(e)}")
            raise RuntimeError(f"Error listing documents in collection: {str(e)}")

    def rename_document(self, user_id: str, collection_name: str, document_id: str, new_name: str, db: Session) -> bool:
        """Rename a document in a user's collection."""
        try:
            # Verify collection exists
            collection = db.query(UserCollection).filter(
                UserCollection.user_id == user_id,
                UserCollection.collection_name == collection_name
            ).first()
            
            if not collection:
                raise ValueError(f"Collection {collection_name} not found")
            
            full_collection_name = f"{user_id}_{collection_name}"
            vector_db = VectorDatabaseManager(
                qdrant_url=settings.QDRANT_HOST,
                qdrant_api_key=settings.QDRANT_API_KEY,
                collection_name=full_collection_name
            )
            
            success = vector_db.update_document_name(document_id, new_name)
            if success:
                logger.debug(f"Renamed document {document_id} to {new_name} in collection {full_collection_name}")
            return success
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Error renaming document: {str(e)}")
            raise RuntimeError(f"Error renaming document: {str(e)}")

    def get_document_content_url(self, user_id: str, collection_name: str, document_id: str, db: Session) -> str:
        """Get the Firebase download URL for a document."""
        try:
            # Verify collection exists
            collection = db.query(UserCollection).filter(
                UserCollection.user_id == user_id,
                UserCollection.collection_name == collection_name
            ).first()
            
            if not collection:
                raise ValueError(f"Collection {collection_name} not found")
            
            full_collection_name = f"{user_id}_{collection_name}"
            vector_db = VectorDatabaseManager(
                qdrant_url=settings.QDRANT_HOST,
                qdrant_api_key=settings.QDRANT_API_KEY,
                collection_name=full_collection_name
            )
            
            # Get document info to find storage path
            documents = vector_db.list_documents()
            document = next((doc for doc in documents if doc["document_id"] == document_id), None)
            
            if not document or not document.get("storage_path"):
                raise ValueError(f"Document {document_id} not found or has no storage path")
            
            # Generate download URL from Firebase Storage
            blob = self.bucket.blob(document["storage_path"])
            download_url = blob.generate_signed_url(
                version="v4",
                expiration=3600,  # 1 hour
                method="GET"
            )
            
            logger.debug(f"Generated download URL for document {document_id}")
            return download_url
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Error getting document content URL: {str(e)}")
            raise RuntimeError(f"Error getting document content URL: {str(e)}")

    def rename_collection_with_migration(self, user_id: str, old_collection_name: str, new_collection_name: str, db: Session) -> bool:
        """Rename a collection including both database and Qdrant migration."""
        try:
            # Verify old collection exists
            collection = db.query(UserCollection).filter(
                UserCollection.user_id == user_id,
                UserCollection.collection_name == old_collection_name
            ).first()
            
            if not collection:
                raise ValueError(f"Collection {old_collection_name} not found")
            
            # Check if new name already exists
            existing = db.query(UserCollection).filter(
                UserCollection.user_id == user_id,
                UserCollection.collection_name == new_collection_name
            ).first()
            
            if existing:
                raise ValueError(f"Collection with name {new_collection_name} already exists")
            
            old_full_name = f"{user_id}_{old_collection_name}"
            new_full_name = f"{user_id}_{new_collection_name}"
            
            # Rename the Qdrant collection
            vector_db = VectorDatabaseManager(
                qdrant_url=settings.QDRANT_HOST,
                qdrant_api_key=settings.QDRANT_API_KEY,
                collection_name=old_full_name  # This doesn't matter for rename operation
            )
            
            success = vector_db.rename_collection(old_full_name, new_full_name)
            if not success:
                raise RuntimeError("Failed to rename Qdrant collection")
            
            # Update database metadata
            collection.collection_name = new_collection_name
            collection.full_collection_name = new_full_name
            db.commit()
            
            logger.debug(f"Successfully renamed collection from {old_collection_name} to {new_collection_name}")
            return True
            
        except ValueError:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error renaming collection with migration: {str(e)}")
            raise RuntimeError(f"Error renaming collection: {str(e)}")

    def delete_document(self, user_id: str, collection_name: str, document_id: str, db: Session) -> bool:
        """Delete a document from a collection."""
        try:
            logger.info(f"Starting delete_document: user_id={user_id}, collection={collection_name}, doc_id={document_id}")
            
            # Verify collection exists
            collection = db.query(UserCollection).filter(
                UserCollection.user_id == user_id,
                UserCollection.collection_name == collection_name
            ).first()
            
            if not collection:
                logger.error(f"Collection {collection_name} not found for user {user_id}")
                raise ValueError(f"Collection {collection_name} not found")
            
            full_collection_name = f"{user_id}_{collection_name}"
            logger.debug(f"Full collection name: {full_collection_name}")
            
            vector_db = VectorDatabaseManager(
                qdrant_url=settings.QDRANT_HOST,
                qdrant_api_key=settings.QDRANT_API_KEY,
                collection_name=full_collection_name
            )
            
            # Get document info to find storage path before deletion
            documents = vector_db.list_documents()
            logger.info(f"Available documents in collection: {[{'id': doc.get('document_id', 'NO_ID'), 'name': doc.get('document_name', 'NO_NAME')} for doc in documents]}")
            logger.info(f"Looking for document ID: '{document_id}' (type: {type(document_id)})")
            
            # Check for exact match and also try string conversion
            document = None
            for doc in documents:
                doc_id = doc.get("document_id")
                logger.debug(f"Comparing '{doc_id}' (type: {type(doc_id)}) with '{document_id}' (type: {type(document_id)})")
                if str(doc_id) == str(document_id):
                    document = doc
                    break
            
            # Try to delete from vector database regardless of whether we found it in list_documents
            # This handles cases where list_documents might not return all documents
            logger.info(f"Attempting to delete document {document_id} from vector database")
            success = vector_db.delete_document(document_id)
            
            if not success:
                available_ids = [doc.get('document_id', 'NO_ID') for doc in documents]
                error_msg = f"Document {document_id} not found in collection {collection_name}. Available documents: {available_ids}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            # Delete from Firebase Storage if we found the document and it has storage path
            if document and document.get("storage_path"):
                try:
                    blob = self.bucket.blob(document["storage_path"])
                    blob.delete()
                    logger.debug(f"Deleted document from Firebase Storage: {document['storage_path']}")
                except Exception as e:
                    logger.warning(f"Could not delete from Firebase Storage: {str(e)}")
                    # Continue even if Firebase deletion fails
            
            logger.debug(f"Successfully deleted document {document_id} from collection {collection_name}")
            return True
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Error deleting document: {str(e)}")
            raise RuntimeError(f"Error deleting document: {str(e)}")