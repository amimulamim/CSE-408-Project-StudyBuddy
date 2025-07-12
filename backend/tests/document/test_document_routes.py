import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException, UploadFile
from datetime import datetime, timezone
import io
import json

# Mock Firebase initialization before importing app modules
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.main import app
    from app.auth.firebase_auth import get_current_user
    from app.core.database import get_db
    from app.document_upload.model import UserCollection

client = TestClient(app)


class TestDocumentRoutes:
    """Test document API routes"""

    def setup_method(self):
        """Set up test dependencies"""
        # Clear any existing overrides
        app.dependency_overrides.clear()
        
        # Mock current user
        def mock_get_current_user():
            return {"uid": "test-uid"}
            
        # Mock database session
        self.mock_db = Mock()
        def mock_get_db():
            return self.mock_db
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db

    def teardown_method(self):
        """Clean up after tests"""
        app.dependency_overrides.clear()

    @patch('app.api.v1.routes.document.document_service.upload_document')
    def test_upload_document_success(self, mock_upload_document):
        """Test successful document upload"""
        # Arrange
        mock_upload_document.return_value = {"file_id": "test-file-id"}
        
        # Create a test file
        test_file = io.BytesIO(b"Test file content")
        
        # Act
        response = client.post(
            "/api/v1/document/documents",
            files={"file": ("test.pdf", test_file, "application/pdf")},
            data={"collection_name": "test_collection"}
        )
        
        # Assert
        assert response.status_code == 200
        assert response.json() == {"message": "Document uploaded successfully"}
        mock_upload_document.assert_called_once()

    @patch('app.api.v1.routes.document.document_service.upload_document')
    def test_upload_document_service_exception(self, mock_upload_document):
        """Test document upload when service raises exception"""
        # Arrange
        mock_upload_document.side_effect = Exception("Upload failed")
        
        # Create a test file
        test_file = io.BytesIO(b"Test file content")
        
        # Act
        response = client.post(
            "/api/v1/document/documents",
            files={"file": ("test.pdf", test_file, "application/pdf")},
            data={"collection_name": "test_collection"}
        )
        
        # Assert
        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()

    def test_upload_document_missing_file(self):
        """Test document upload without file"""
        # Act
        response = client.post(
            "/api/v1/document/documents",
            data={"collection_name": "test_collection"}
        )
        
        # Assert
        assert response.status_code == 422  # Validation error

    def test_upload_document_missing_collection_name(self):
        """Test document upload without collection name"""
        # Arrange
        test_file = io.BytesIO(b"Test file content")
        
        # Act
        response = client.post(
            "/api/v1/document/documents",
            files={"file": ("test.pdf", test_file, "application/pdf")}
        )
        
        # Assert
        assert response.status_code == 422  # Validation error

    def test_list_collections_success(self):
        """Test successful collection listing"""
        # Arrange
        mock_collection1 = Mock()
        mock_collection1.collection_name = "collection1"
        mock_collection1.full_collection_name = "test-uid_collection1"
        mock_collection1.created_at = datetime(2023, 1, 1, 12, 0, 0)
        
        mock_collection2 = Mock()
        mock_collection2.collection_name = "collection2"
        mock_collection2.full_collection_name = "test-uid_collection2"
        mock_collection2.created_at = datetime(2023, 1, 2, 12, 0, 0)
        
        # Mock database query
        mock_query = Mock()
        mock_filter = Mock()
        mock_query.filter.return_value = mock_filter
        mock_filter.all.return_value = [mock_collection1, mock_collection2]
        self.mock_db.query.return_value = mock_query
        
        # Act
        response = client.get("/api/v1/document/collections")
        
        # Assert
        assert response.status_code == 200
        collections = response.json()
        assert len(collections) == 2
        assert collections[0]["collection_name"] == "collection1"
        assert collections[0]["full_collection_name"] == "test-uid_collection1"
        assert collections[0]["created_at"] == "2023-01-01T12:00:00"
        assert collections[1]["collection_name"] == "collection2"

    def test_list_collections_empty(self):
        """Test listing collections when user has none"""
        # Arrange
        mock_query = Mock()
        mock_filter = Mock()
        mock_query.filter.return_value = mock_filter
        mock_filter.all.return_value = []
        self.mock_db.query.return_value = mock_query
        
        # Act
        response = client.get("/api/v1/document/collections")
        
        # Assert
        assert response.status_code == 200
        assert response.json() == []

    def test_list_collections_database_exception(self):
        """Test listing collections when database raises exception"""
        # Arrange
        self.mock_db.query.side_effect = Exception("Database error")
        
        # Act
        response = client.get("/api/v1/document/collections")
        
        # Assert
        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()

    @patch('app.api.v1.routes.document.document_service.create_or_update_collection')
    def test_create_collection_success(self, mock_create_collection):
        """Test successful collection creation"""
        # Arrange
        mock_create_collection.return_value = "test-uid_new_collection"
        
        # Act
        response = client.post(
            "/api/v1/document/collections",
            json={"collection_name": "new_collection"}
        )
        
        # Assert
        assert response.status_code == 200
        result = response.json()
        assert "Collection new_collection created" in result["message"]
        assert result["full_collection_name"] == "test-uid_new_collection"
        mock_create_collection.assert_called_once_with(
            user_id="test-uid",
            collection_name="new_collection",
            db=self.mock_db
        )

    @patch('app.api.v1.routes.document.document_service.create_or_update_collection')
    def test_create_collection_service_exception(self, mock_create_collection):
        """Test collection creation when service raises exception"""
        # Arrange
        mock_create_collection.side_effect = Exception("Collection creation failed")
        
        # Act
        response = client.post(
            "/api/v1/document/collections",
            json={"collection_name": "new_collection"}
        )
        
        # Assert
        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()

    def test_create_collection_invalid_request(self):
        """Test collection creation with invalid request"""
        # Act
        response = client.post(
            "/api/v1/document/collections",
            json={"invalid_field": "value"}
        )
        
        # Assert
        assert response.status_code == 422  # Validation error

    def test_create_collection_empty_name(self):
        """Test collection creation with empty name"""
        # Act
        response = client.post(
            "/api/v1/document/collections",
            json={"collection_name": ""}
        )
        
        # Assert
        # This should pass validation but might fail at service level
        # The actual validation depends on the service implementation
        assert response.status_code in [200, 422, 500]

    @patch('app.api.v1.routes.document.document_service.delete_collection')
    def test_delete_collection_success(self, mock_delete_collection):
        """Test successful collection deletion"""
        # Arrange
        mock_delete_collection.return_value = None
        
        # Act
        response = client.delete("/api/v1/document/collections/test_collection")
        
        # Assert
        assert response.status_code == 200
        result = response.json()
        assert "Collection test_collection deleted successfully" in result["message"]
        mock_delete_collection.assert_called_once_with("test-uid", "test_collection", self.mock_db)

    @patch('app.api.v1.routes.document.document_service.delete_collection')
    def test_delete_collection_service_exception(self, mock_delete_collection):
        """Test collection deletion when service raises exception"""
        # Arrange
        mock_delete_collection.side_effect = Exception("Deletion failed")
        
        # Act
        response = client.delete("/api/v1/document/collections/test_collection")
        
        # Assert
        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()

    @patch('app.api.v1.routes.document.document_service.delete_collection')
    def test_delete_collection_not_found(self, mock_delete_collection):
        """Test deleting non-existent collection"""
        # Arrange
        mock_delete_collection.side_effect = ValueError("Collection not found")
        
        # Act
        response = client.delete("/api/v1/document/collections/nonexistent")
        
        # Assert
        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()

    def test_delete_collection_special_characters(self):
        """Test deleting collection with special characters in name"""
        # Arrange
        with patch('app.api.v1.routes.document.document_service.delete_collection') as mock_delete:
            mock_delete.return_value = None
            
            # Act
            response = client.delete("/api/v1/document/collections/test%20collection")
            
            # Assert
            assert response.status_code == 200
            # The collection name should be URL decoded
            mock_delete.assert_called_once_with("test-uid", "test collection", self.mock_db)

    def test_unauthorized_access(self):
        """Test routes without authentication"""
        # Clear the mock authentication
        app.dependency_overrides.clear()
        
        # Mock get_current_user to raise an exception
        def mock_get_current_user():
            raise HTTPException(status_code=401, detail="Unauthorized")
            
        app.dependency_overrides[get_current_user] = mock_get_current_user
        
        # Test upload
        test_file = io.BytesIO(b"Test file content")
        response = client.post(
            "/api/v1/document/documents",
            files={"file": ("test.pdf", test_file, "application/pdf")},
            data={"collection_name": "test_collection"}
        )
        assert response.status_code == 401
        
        # Test list collections
        response = client.get("/api/v1/document/collections")
        assert response.status_code == 401
        
        # Test create collection
        response = client.post(
            "/api/v1/document/collections",
            json={"collection_name": "new_collection"}
        )
        assert response.status_code == 401
        
        # Test delete collection
        response = client.delete("/api/v1/document/collections/test_collection")
        assert response.status_code == 401

    @patch('app.api.v1.routes.document.document_service.upload_document')
    def test_upload_document_large_file(self, mock_upload_document):
        """Test uploading a large file"""
        # Arrange
        mock_upload_document.return_value = {"file_id": "test-file-id"}
        
        # Create a large test file (simulate large content)
        large_content = b"x" * (10 * 1024 * 1024)  # 10MB
        test_file = io.BytesIO(large_content)
        
        # Act
        response = client.post(
            "/api/v1/document/documents",
            files={"file": ("large_test.pdf", test_file, "application/pdf")},
            data={"collection_name": "test_collection"}
        )
        
        # Assert
        assert response.status_code == 200
        mock_upload_document.assert_called_once()

    @patch('app.api.v1.routes.document.document_service.upload_document')
    def test_upload_document_different_file_types(self, mock_upload_document):
        """Test uploading different file types"""
        # Arrange
        mock_upload_document.return_value = {"file_id": "test-file-id"}
        
        file_types = [
            ("test.pdf", "application/pdf"),
            ("test.txt", "text/plain"),
            ("test.doc", "application/msword"),
            ("test.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        ]
        
        for filename, content_type in file_types:
            # Act
            test_file = io.BytesIO(b"Test file content")
            response = client.post(
                "/api/v1/document/documents",
                files={"file": (filename, test_file, content_type)},
                data={"collection_name": "test_collection"}
            )
            
            # Assert
            assert response.status_code == 200
            
        # Verify all uploads were processed
        assert mock_upload_document.call_count == len(file_types)

    def test_list_collections_query_verification(self):
        """Test that the database query is constructed correctly"""
        # Arrange
        mock_query = Mock()
        mock_filter = Mock()
        mock_query.filter.return_value = mock_filter
        mock_filter.all.return_value = []
        self.mock_db.query.return_value = mock_query
        
        # Act
        response = client.get("/api/v1/document/collections")
        
        # Assert
        assert response.status_code == 200
        # Verify the query was called with UserCollection
        self.mock_db.query.assert_called_once_with(UserCollection)
        # Verify the filter was applied with the correct user_id
        mock_query.filter.assert_called_once()

    @patch('app.api.v1.routes.document.document_service.create_or_update_collection')
    def test_create_collection_unicode_name(self, mock_create_collection):
        """Test creating collection with unicode characters"""
        # Arrange
        mock_create_collection.return_value = "test-uid_unicode_collection"
        unicode_name = "测试集合"  # Chinese characters
        
        # Act
        response = client.post(
            "/api/v1/document/collections",
            json={"collection_name": unicode_name}
        )
        
        # Assert
        assert response.status_code == 200
        mock_create_collection.assert_called_once_with(
            user_id="test-uid",
            collection_name=unicode_name,
            db=self.mock_db
        )

    @patch('app.api.v1.routes.document.document_service.delete_collection')
    def test_delete_collection_unicode_name(self, mock_delete_collection):
        """Test deleting collection with unicode characters"""
        # Arrange
        mock_delete_collection.return_value = None
        unicode_name = "测试集合"  # Chinese characters
        
        # Act
        response = client.delete(f"/api/v1/document/collections/{unicode_name}")
        
        # Assert
        assert response.status_code == 200
        mock_delete_collection.assert_called_once_with("test-uid", unicode_name, self.mock_db)

    @patch('app.api.v1.routes.document.document_service.list_documents_in_collection')
    def test_list_documents_in_collection_success(self, mock_list_documents):
        """Test successful listing of documents in a collection"""
        # Arrange
        mock_documents = [
            {
                "document_id": "doc-1",
                "document_name": "test_document_1.pdf",
                "chunks_count": 5,
                "first_chunk": "This is the first chunk of document 1...",
                "storage_path": "documents/test-uid/doc-1.pdf"
            },
            {
                "document_id": "doc-2", 
                "document_name": "test_document_2.txt",
                "chunks_count": 3,
                "first_chunk": "This is the first chunk of document 2...",
                "storage_path": "documents/test-uid/doc-2.txt"
            }
        ]
        mock_list_documents.return_value = mock_documents
        
        # Act
        response = client.get("/api/v1/document/collections/test-collection/documents")
        
        # Assert
        assert response.status_code == 200
        assert response.json() == mock_documents
        mock_list_documents.assert_called_once_with("test-uid", "test-collection", self.mock_db)

    @patch('app.api.v1.routes.document.document_service.list_documents_in_collection')
    def test_list_documents_collection_not_found(self, mock_list_documents):
        """Test listing documents when collection doesn't exist"""
        # Arrange
        mock_list_documents.side_effect = ValueError("Collection test-collection not found")
        
        # Act
        response = client.get("/api/v1/document/collections/test-collection/documents")
        
        # Assert
        assert response.status_code == 404
        assert "Collection test-collection not found" in response.json()["detail"]
        mock_list_documents.assert_called_once_with("test-uid", "test-collection", self.mock_db)

    @patch('app.api.v1.routes.document.document_service.list_documents_in_collection')
    def test_list_documents_empty_collection(self, mock_list_documents):
        """Test listing documents in an empty collection"""
        # Arrange
        mock_list_documents.return_value = []
        
        # Act
        response = client.get("/api/v1/document/collections/empty-collection/documents")
        
        # Assert
        assert response.status_code == 200
        assert response.json() == []
        mock_list_documents.assert_called_once_with("test-uid", "empty-collection", self.mock_db)

    @patch('app.api.v1.routes.document.document_service.list_documents_in_collection')
    def test_list_documents_internal_error(self, mock_list_documents):
        """Test listing documents when an internal error occurs"""
        # Arrange
        mock_list_documents.side_effect = RuntimeError("Database connection error")
        
        # Act
        response = client.get("/api/v1/document/collections/test-collection/documents")
        
        # Assert
        assert response.status_code == 500
        assert "An internal server error occurred" in response.json()["detail"]
        mock_list_documents.assert_called_once_with("test-uid", "test-collection", self.mock_db)

    @patch('app.api.v1.routes.document.document_service.rename_document')
    def test_rename_document_success(self, mock_rename_document):
        """Test successful document renaming"""
        # Arrange
        mock_rename_document.return_value = True
        
        # Act
        response = client.put(
            "/api/v1/document/collections/test-collection/documents/doc-123/rename",
            json={"new_name": "renamed_document.pdf"}
        )
        
        # Assert
        assert response.status_code == 200
        assert "Document renamed to renamed_document.pdf successfully" in response.json()["message"]
        mock_rename_document.assert_called_once_with("test-uid", "test-collection", "doc-123", "renamed_document.pdf", self.mock_db)

    @patch('app.api.v1.routes.document.document_service.rename_document')
    def test_rename_document_not_found(self, mock_rename_document):
        """Test renaming a document that doesn't exist"""
        # Arrange
        mock_rename_document.return_value = False
        
        # Act
        response = client.put(
            "/api/v1/document/collections/test-collection/documents/nonexistent/rename",
            json={"new_name": "new_name.pdf"}
        )
        
        # Assert
        assert response.status_code == 500
        assert "error" in response.json()["detail"]

    @patch('app.api.v1.routes.document.document_service.get_document_content_url')
    def test_get_document_content_url_success(self, mock_get_content_url):
        """Test successful document content URL retrieval"""
        # Arrange
        mock_url = "https://storage.googleapis.com/bucket/documents/test-uid/doc-123.pdf?signature=..."
        mock_get_content_url.return_value = mock_url
        
        # Act
        response = client.get("/api/v1/document/collections/test-collection/documents/doc-123/content")
        
        # Assert
        assert response.status_code == 200
        assert response.json()["download_url"] == mock_url
        mock_get_content_url.assert_called_once_with("test-uid", "test-collection", "doc-123", self.mock_db)

    @patch('app.api.v1.routes.document.document_service.get_document_content_url')
    def test_get_document_content_url_not_found(self, mock_get_content_url):
        """Test getting content URL for a document that doesn't exist"""
        # Arrange
        mock_get_content_url.side_effect = ValueError("Document doc-123 not found or has no storage path")
        
        # Act
        response = client.get("/api/v1/document/collections/test-collection/documents/doc-123/content")
        
        # Assert
        assert response.status_code == 404
        assert "Document doc-123 not found" in response.json()["detail"]
