import os
import uuid
import PyPDF2
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http import models
import hashlib
from dotenv import load_dotenv
from PIL import Image
import io
import logging
from app.rag.document_converter import DocumentConverter
from app.rag.text_chunker import TextChunker
from app.core.vector_db import VectorDatabaseManager
import google.generativeai as genai
# Import necessary modules


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()
class DocumentProcessor:
    """Orchestrates document ingestion and preprocessing pipeline."""
    
    def __init__(self):
        self.converter = DocumentConverter()
        self.chunker = TextChunker()
        self.vector_db = VectorDatabaseManager(
            qdrant_url=os.getenv("QDRANT_HOST"),
            qdrant_api_key=os.getenv("QDRANT_API_KEY"),
            collection_name=os.getenv("QDRANT_COLLECTION_NAME")
        )
        self.embedding_api_key = os.getenv("GEMINI_API_KEY")
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generates embeddings using Gemini API."""
        try:
            result = genai.embed_content(
                model="models/embedding-001",
                content=text,
                task_type="SEMANTIC_SIMILARITY"
            )
            embedding = result.get('embedding')
            if not embedding or not isinstance(embedding, list):
                raise ValueError("Invalid embedding response from Gemini API")
            return embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise Exception(f"Error generating embedding: {str(e)}")
    
    def process_document(self, file_path: str) -> str:
        """Processes a document and stores it in the vector database."""
        try:
            document_id = hashlib.md5(file_path.encode()).hexdigest()
            text = self.converter.extract_text(file_path)
            chunks = self.chunker.chunk_text(text)
            embeddings = [self.generate_embedding(chunk) for chunk in chunks]
            self.vector_db.upsert_vectors(document_id, chunks, embeddings)
            return document_id
        except Exception as e:
            raise Exception(f"Error processing document: {str(e)}")
