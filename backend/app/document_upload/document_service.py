import uuid
import logging
from fastapi import UploadFile
from firebase_admin import storage
from sqlalchemy.orm import Session
from app.core.config import settings
from app.document_upload.document_converter import DocumentConverter
from app.document_upload.text_chunker import TextChunker
from app.document_upload.embedding_generator import EmbeddingGenerator
from app.core.vector_db import VectorDatabaseManager
from app.document_upload.model import UserCollection

logger = logging.getLogger(__name__)

class DocumentService:
    """Handles document upload and Qdrant collection management."""
    def __init__(self):
        try:
            self.converter = DocumentConverter()
            self.chunker = TextChunker(chunk_size=1000, overlap=200)
            self.embedding_generator = EmbeddingGenerator()
            self.bucket = storage.bucket(settings.FIREBASE_STORAGE_BUCKET)
            logger.debug("Initialized DocumentService successfully")
        except Exception as e:
            logger.error(f"Error initializing DocumentService: {str(e)}")
            raise

    async def create_or_update_collection(self, user_id: str, collection_name: str, db: Session) -> str:
        """Creates or updates a Qdrant collection and stores metadata in PostgreSQL."""
        full_collection_name = f"{user_id}_{collection_name}"
        try:
            # Validate collection name
            if not collection_name or len(collection_name) > 50 or not collection_name.isalnum():
                raise ValueError("Invalid collection name. Use alphanumeric characters, max 50.")

            # Check if collection exists in PostgreSQL
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
                    full_collection_name=full_collection_name
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
            # Check if collection exists
            collection = db.query(UserCollection).filter(
                UserCollection.user_id == user_id,
                UserCollection.collection_name == collection_name
            ).first()
            if not collection:
                raise HTTPException(status_code=404, detail=f"Collection {collection_name} not found")

            # Delete from Qdrant
            vector_db = VectorDatabaseManager(
                qdrant_url=settings.QDRANT_HOST,
                qdrant_api_key=settings.QDRANT_API_KEY,
                collection_name=full_collection_name
            )
            vector_db.delete_collection()

            # Delete from PostgreSQL
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
        """Uploads document to Firebase Storage and stores embeddings in user-specified Qdrant collection."""
        try:
            # Validate file type
            allowed_types = {"application/pdf", "text/plain"}
            if file.content_type not in allowed_types:
                raise ValueError(f"Unsupported file type: {file.content_type}")

            # Generate unique file path
            file_extension = file.filename.split(".")[-1]
            storage_path = f"documents/{user_id}/{uuid.uuid4()}.{file_extension}"

            # Upload to Firebase Storage
            blob = self.bucket.blob(storage_path)
            content = await file.read()
            blob.upload_from_string(content, content_type=file.content_type)
            logger.debug(f"Uploaded file {file.filename} to {storage_path}")

            # Create or update user-specific Qdrant collection
            full_collection_name = await self.create_or_update_collection(user_id, collection_name, db)

            # Initialize VectorDatabaseManager for this collection
            vector_db = VectorDatabaseManager(
                qdrant_url=settings.QDRANT_HOST,
                qdrant_api_key=settings.QDRANT_API_KEY,
                collection_name=full_collection_name
            )

            # Extract text
            text = self.converter.extract_text(content, file.content_type)
            if not text:
                raise ValueError("No text extracted from document")

            # Chunk text
            chunks = self.chunker.chunk_text(text)
            if not chunks:
                raise ValueError("No chunks generated from document text")

            # Generate embeddings
            document_id = str(uuid.uuid4())
            embeddings = [self.embedding_generator.get_embedding(chunk) for chunk in chunks]

            # Store in Qdrant
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