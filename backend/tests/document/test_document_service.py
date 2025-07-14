import pytest
import uuid
import os
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from datetime import datetime, timezone
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.document_upload.document_service import DocumentService
from app.document_upload.model import UserCollection


class TestDocumentService:
    """Test DocumentService class for document upload, storage, and retrieval"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock(spec=Session)

    @pytest.fixture
    def mock_upload_file(self):
        """Mock UploadFile"""
        file = Mock(spec=UploadFile)
        file.filename = "test_document.pdf"
        file.content_type = "application/pdf"
        file.read = AsyncMock(return_value=b"mock pdf content")
        return file

    @pytest.fixture
    def mock_text_upload_file(self):
        """Mock text UploadFile"""
        file = Mock(spec=UploadFile)
        file.filename = "test_document.txt"
        file.content_type = "text/plain"
        file.read = AsyncMock(return_value=b"mock text content")
        return file

    @pytest.fixture
    def mock_dependencies(self):
        """Mock all dependencies"""
        with patch('app.document_upload.document_service.DocumentConverter') as mock_converter_class, \
             patch('app.document_upload.document_service.TextChunker') as mock_chunker_class, \
             patch('app.document_upload.document_service.EmbeddingGenerator') as mock_embedding_class, \
             patch('app.document_upload.document_service.VectorDatabaseManager') as mock_vector_class, \
             patch('app.document_upload.document_service.storage') as mock_storage, \
             patch('app.document_upload.document_service.settings') as mock_settings:
            
            # Setup settings
            mock_settings.FIREBASE_STORAGE_BUCKET = "test-bucket"
            mock_settings.QDRANT_HOST = "localhost"
            mock_settings.QDRANT_API_KEY = "test-key"
            
            # Setup converter
            mock_converter = Mock()
            mock_converter.extract_text.return_value = "extracted text content"
            mock_converter_class.return_value = mock_converter
            
            # Setup chunker
            mock_chunker = Mock()
            mock_chunker.chunk_text.return_value = ["chunk1", "chunk2", "chunk3"]
            mock_chunker_class.return_value = mock_chunker
            
            # Setup embedding generator
            mock_embedding = Mock()
            mock_embedding.get_embedding.side_effect = [
                [0.1, 0.2, 0.3],  # chunk1 embedding
                [0.4, 0.5, 0.6],  # chunk2 embedding
                [0.7, 0.8, 0.9]   # chunk3 embedding
            ]
            mock_embedding_class.return_value = mock_embedding
            
            # Setup vector database
            mock_vector_db = Mock()
            mock_vector_db.create_collection.return_value = None
            mock_vector_db.upsert_vectors.return_value = None
            mock_vector_db.search_vectors.return_value = [
                {"text": "search result 1", "score": 0.9, "document_id": "doc1"},
                {"text": "search result 2", "score": 0.8, "document_id": "doc2"}
            ]
            mock_vector_db.delete_collection.return_value = None
            mock_vector_class.return_value = mock_vector_db
            
            # Setup Firebase storage
            mock_bucket = Mock()
            mock_blob = Mock()
            mock_blob.upload_from_string.return_value = None
            mock_bucket.blob.return_value = mock_blob
            mock_storage.bucket.return_value = mock_bucket
            
            yield {
                'converter': mock_converter,
                'chunker': mock_chunker,
                'embedding': mock_embedding,
                'vector_db': mock_vector_db,
                'bucket': mock_bucket,
                'blob': mock_blob
            }

    @pytest.fixture
    def document_service(self, mock_dependencies):
        """Create DocumentService instance with mocked dependencies"""
        with patch.dict(os.environ, {"TESTING": "true"}):
            service = DocumentService()
            # Override the bucket with our properly mocked version
            service.bucket = mock_dependencies['bucket']
            return service

    @pytest.fixture
    def mock_user_collection(self):
        """Mock UserCollection model"""
        collection = Mock(spec=UserCollection)
        collection.user_id = "testuser"
        collection.collection_name = "testcollection"
        collection.full_collection_name = "testuser_testcollection"
        collection.created_at = datetime.now(timezone.utc)
        return collection

    def test_init_success(self, mock_dependencies):
        """Test successful initialization of DocumentService"""
        service = DocumentService()
        
        assert service.converter is not None
        assert service.chunker is not None
        assert service.embedding_generator is not None
        assert service.bucket is not None

    def test_init_testing_environment(self, mock_dependencies):
        """Test initialization in testing environment"""
        with patch.dict(os.environ, {'TESTING': 'true'}):
            service = DocumentService()
            assert service.bucket is not None

    def test_init_failure(self):
        """Test DocumentService initialization failure"""
        with patch('app.document_upload.document_service.DocumentConverter') as mock_converter:
            mock_converter.side_effect = Exception("Initialization error")
            
            with pytest.raises(Exception) as exc_info:
                DocumentService()
            assert "Initialization error" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_create_or_update_collection_new_collection(self, document_service, mock_db, mock_dependencies):
        """Test creating a new collection"""
        # Arrange
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        
        # Act
        result = await document_service.create_or_update_collection(
            user_id="testuser",
            collection_name="testcollection",
            db=mock_db
        )
        
        # Assert
        assert result == "testuser_testcollection"
        mock_dependencies['vector_db'].create_collection.assert_called_once()
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_or_update_collection_existing_collection(self, document_service, mock_db, mock_user_collection):
        """Test with existing collection"""
        # Arrange
        mock_user_collection.user_id = "testuser"
        mock_user_collection.collection_name = "testcollection"
        mock_user_collection.full_collection_name = "testuser_testcollection"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user_collection
        
        # Act
        result = await document_service.create_or_update_collection(
            user_id="testuser",
            collection_name="testcollection",
            db=mock_db
        )
        
        # Assert
        assert result == "testuser_testcollection"
        mock_db.add.assert_not_called()
        mock_db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_or_update_collection_invalid_name_empty(self, document_service, mock_db):
        """Test collection creation with empty name"""
        with pytest.raises(Exception) as exc_info:
            await document_service.create_or_update_collection(
                user_id="testuser",
                collection_name="",
                db=mock_db
            )
        assert "Error managing Qdrant collection" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_create_or_update_collection_invalid_name_too_long(self, document_service, mock_db):
        """Test collection creation with name too long"""
        long_name = "a" * 51  # 51 characters
        
        with pytest.raises(Exception) as exc_info:
            await document_service.create_or_update_collection(
                user_id="testuser",
                collection_name=long_name,
                db=mock_db
            )
        assert "Error managing Qdrant collection" in str(exc_info.value)



    @pytest.mark.asyncio
    async def test_create_or_update_collection_database_error(self, document_service, mock_db):
        """Test collection creation with database error"""
        # Arrange
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.add.side_effect = Exception("Database error")
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await document_service.create_or_update_collection(
                user_id="testuser",
                collection_name="testcollection",
                db=mock_db
            )
        assert "Error managing Qdrant collection" in str(exc_info.value)
        mock_db.rollback.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_collection_success(self, document_service, mock_db, mock_user_collection, mock_dependencies):
        """Test successful collection deletion"""
        # Arrange
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user_collection
        mock_db.delete.return_value = None
        mock_db.commit.return_value = None
        
        # Act
        await document_service.delete_collection(
            user_id="testuser",
            collection_name="testcollection",
            db=mock_db
        )
        
        # Assert
        mock_dependencies['vector_db'].delete_collection.assert_called_once()
        mock_db.delete.assert_called_once_with(mock_user_collection)
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_collection_not_found(self, document_service, mock_db):
        """Test collection deletion when collection not found"""
        # Arrange
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await document_service.delete_collection(
                user_id="testuser",
                collection_name="nonexistent",
                db=mock_db
            )
        assert exc_info.value.status_code == 404
        assert "Collection nonexistent not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_delete_collection_database_error(self, document_service, mock_db, mock_user_collection):
        """Test collection deletion with database error"""
        # Arrange
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user_collection
        mock_db.delete.side_effect = Exception("Database error")
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await document_service.delete_collection(
                user_id="testuser",
                collection_name="testcollection",
                db=mock_db
            )
        assert "Error deleting Qdrant collection" in str(exc_info.value)
        mock_db.rollback.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_document_pdf_success(self, document_service, mock_upload_file, mock_db, mock_dependencies):
        """Test successful PDF document upload"""
        # Arrange
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        
        # Act
        result = await document_service.upload_document(
            file=mock_upload_file,
            user_id="testuser",
            collection_name="testcollection",
            db=mock_db
        )
        
        # Assert
        assert "document_id" in result
        assert result["file_name"] == "test_document.pdf"
        assert result["file_type"] == "application/pdf"
        assert result["collection_name"] == "testcollection"
        assert "storage_path" in result
        
        # Verify method calls
        mock_dependencies['converter'].extract_text.assert_called_once()
        mock_dependencies['chunker'].chunk_text.assert_called_once()
        mock_dependencies['embedding'].get_embedding.assert_called()
        mock_dependencies['vector_db'].upsert_vectors.assert_called_once()
        mock_dependencies['blob'].upload_from_string.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_document_text_success(self, document_service, mock_text_upload_file, mock_db, mock_dependencies):
        """Test successful text document upload"""
        # Arrange
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        
        # Act
        result = await document_service.upload_document(
            file=mock_text_upload_file,
            user_id="testuser",
            collection_name="testcollection",
            db=mock_db
        )
        
        # Assert
        assert result["file_type"] == "text/plain"
        assert result["file_name"] == "test_document.txt"

    @pytest.mark.asyncio
    async def test_upload_document_unsupported_file_type(self, document_service, mock_db):
        """Test document upload with unsupported file type"""
        # Arrange
        unsupported_file = Mock(spec=UploadFile)
        unsupported_file.content_type = "application/msword"
        unsupported_file.filename = "test.doc"
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await document_service.upload_document(
                file=unsupported_file,
                user_id="testuser",
                collection_name="testcollection",
                db=mock_db
            )
        assert "Error uploading document" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_upload_document_no_text_extracted(self, document_service, mock_upload_file, mock_db, mock_dependencies):
        """Test document upload when no text is extracted"""
        # Arrange
        mock_dependencies['converter'].extract_text.return_value = ""
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await document_service.upload_document(
                file=mock_upload_file,
                user_id="testuser",
                collection_name="testcollection",
                db=mock_db
            )
        assert "Error uploading document" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_upload_document_no_chunks_generated(self, document_service, mock_upload_file, mock_db, mock_dependencies):
        """Test document upload when no chunks are generated"""
        # Arrange
        mock_dependencies['chunker'].chunk_text.return_value = []
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await document_service.upload_document(
                file=mock_upload_file,
                user_id="testuser",
                collection_name="testcollection",
                db=mock_db
            )
        assert "Error uploading document" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_upload_document_file_read_error(self, document_service, mock_db):
        """Test document upload with file read error"""
        # Arrange
        error_file = Mock(spec=UploadFile)
        error_file.content_type = "application/pdf"
        error_file.filename = "test.pdf"
        error_file.read = AsyncMock(side_effect=Exception("File read error"))
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await document_service.upload_document(
                file=error_file,
                user_id="testuser",
                collection_name="testcollection",
                db=mock_db
            )
        assert "Error uploading document" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_upload_document_firebase_upload_error(self, document_service, mock_upload_file, mock_db, mock_dependencies):
        """Test document upload with Firebase upload error"""
        # Arrange
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_dependencies['blob'].upload_from_string.side_effect = Exception("Firebase error")
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await document_service.upload_document(
                file=mock_upload_file,
                user_id="testuser",
                collection_name="testcollection",
                db=mock_db
            )
        assert "Error uploading document" in str(exc_info.value)
        mock_db.rollback.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_document_embedding_error(self, document_service, mock_upload_file, mock_db, mock_dependencies):
        """Test document upload with embedding generation error"""
        # Arrange
        mock_dependencies['embedding'].get_embedding.side_effect = Exception("Embedding error")
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await document_service.upload_document(
                file=mock_upload_file,
                user_id="testuser",
                collection_name="testcollection",
                db=mock_db
            )
        assert "Error uploading document" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_upload_document_vector_db_error(self, document_service, mock_upload_file, mock_db, mock_dependencies):
        """Test document upload with vector database error"""
        # Arrange
        mock_dependencies['vector_db'].upsert_vectors.side_effect = Exception("Vector DB error")
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await document_service.upload_document(
                file=mock_upload_file,
                user_id="testuser",
                collection_name="testcollection",
                db=mock_db
            )
        assert "Error uploading document" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_search_documents_success(self, document_service, mock_dependencies):
        """Test successful document search"""
        # Act
        results = await document_service.search_documents(
            query="test query",
            user_id="testuser",
            collection_name="testcollection",
            limit=5
        )
        
        # Assert
        assert len(results) == 2
        assert results[0]["content"] == "search result 1"
        assert results[0]["score"] == pytest.approx(0.9)
        assert results[0]["point_id"] == "doc1"
        assert results[1]["content"] == "search result 2"
        assert results[1]["score"] == pytest.approx(0.8)
        assert results[1]["point_id"] == "doc2"
        
        mock_dependencies['embedding'].get_embedding.assert_called_with("test query")
        mock_dependencies['vector_db'].search_vectors.assert_called_once()

    @pytest.mark.asyncio
    async def test_search_documents_custom_limit(self, document_service, mock_dependencies):
        """Test document search with custom limit"""
        # Act
        await document_service.search_documents(
            query="test query",
            user_id="testuser",
            collection_name="testcollection",
            limit=10
        )
        
        # Assert
        mock_dependencies['vector_db'].search_vectors.assert_called_with(
            [0.1, 0.2, 0.3],  # The actual embedding value returned by the mock
            limit=10
        )

    @pytest.mark.asyncio
    async def test_search_documents_empty_results(self, document_service, mock_dependencies):
        """Test document search with empty results"""
        # Arrange
        mock_dependencies['vector_db'].search_vectors.return_value = []
        
        # Act
        results = await document_service.search_documents(
            query="test query",
            user_id="testuser",
            collection_name="testcollection"
        )
        
        # Assert
        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_search_documents_embedding_error(self, document_service, mock_dependencies):
        """Test document search with embedding generation error"""
        # Arrange
        mock_dependencies['embedding'].get_embedding.side_effect = Exception("Embedding error")
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await document_service.search_documents(
                query="test query",
                user_id="testuser",
                collection_name="testcollection"
            )
        assert "Error searching documents" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_search_documents_vector_db_error(self, document_service, mock_dependencies):
        """Test document search with vector database error"""
        # Arrange
        mock_dependencies['vector_db'].search_vectors.side_effect = Exception("Vector DB error")
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await document_service.search_documents(
                query="test query",
                user_id="testuser",
                collection_name="testcollection"
            )
        assert "Error searching documents" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_search_documents_empty_query(self, document_service, mock_dependencies):
        """Test document search with empty query"""
        # Act
        results = await document_service.search_documents(
            query="",
            user_id="testuser",
            collection_name="testcollection"
        )
        
        # Assert
        assert len(results) == 2  # Should still work with empty query

    @pytest.mark.asyncio
    async def test_search_documents_unicode_query(self, document_service, mock_dependencies):
        """Test document search with unicode query"""
        # Act
        results = await document_service.search_documents(
            query="测试查询 🔍",
            user_id="testuser",
            collection_name="testcollection"
        )
        
        # Assert
        assert len(results) == 2
        mock_dependencies['embedding'].get_embedding.assert_called_with("测试查询 🔍")

    @pytest.mark.asyncio
    async def test_upload_document_filename_without_extension(self, document_service, mock_db, mock_dependencies):
        """Test document upload with filename without extension"""
        # Arrange
        no_ext_file = Mock(spec=UploadFile)
        no_ext_file.filename = "document_without_extension"
        no_ext_file.content_type = "application/pdf"
        no_ext_file.read = AsyncMock(return_value=b"mock content")
        
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        
        # Act
        result = await document_service.upload_document(
            file=no_ext_file,
            user_id="testuser",
            collection_name="testcollection",
            db=mock_db
        )
        
        # Assert
        assert "storage_path" in result
        # Should handle the case where there's no extension

    @pytest.mark.asyncio
    async def test_upload_document_filename_multiple_dots(self, document_service, mock_db, mock_dependencies):
        """Test document upload with filename containing multiple dots"""
        # Arrange
        multi_dot_file = Mock(spec=UploadFile)
        multi_dot_file.filename = "my.document.with.dots.pdf"
        multi_dot_file.content_type = "application/pdf"
        multi_dot_file.read = AsyncMock(return_value=b"mock content")
        
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        
        # Act
        result = await document_service.upload_document(
            file=multi_dot_file,
            user_id="testuser",
            collection_name="testcollection",
            db=mock_db
        )
        
        # Assert
        assert result["file_name"] == "my.document.with.dots.pdf"
        assert "storage_path" in result

    @pytest.mark.asyncio
    async def test_upload_document_large_file(self, document_service, mock_db, mock_dependencies):
        """Test document upload with large file"""
        # Arrange
        large_content = b"x" * 10000  # 10KB content
        large_file = Mock(spec=UploadFile)
        large_file.filename = "large_document.pdf"
        large_file.content_type = "application/pdf"
        large_file.read = AsyncMock(return_value=large_content)
        
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        
        # Act
        result = await document_service.upload_document(
            file=large_file,
            user_id="testuser",
            collection_name="testcollection",
            db=mock_db
        )
        
        # Assert
        assert result["file_name"] == "large_document.pdf"
        mock_dependencies['converter'].extract_text.assert_called_with(large_content, "application/pdf")

    @pytest.mark.asyncio
    async def test_search_documents_result_formatting(self, document_service, mock_dependencies):
        """Test that search results are properly formatted"""
        # Arrange
        mock_dependencies['vector_db'].search_vectors.return_value = [
            {
                "text": "Result with special chars: <>&\"'",
                "score": 0.95,
                "document_id": "special-doc"
            }
        ]
        
        # Act
        results = await document_service.search_documents(
            query="special characters",
            user_id="testuser",
            collection_name="testcollection"
        )
        
        # Assert
        assert len(results) == 1
        assert results[0]["content"] == "Result with special chars: <>&\"'"
        assert results[0]["score"] == pytest.approx(0.95)
        assert results[0]["point_id"] == "special-doc"
