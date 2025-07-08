import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi import UploadFile
import io
import time
import uuid


class TestFileUpload:
    """Test file upload utilities for Firebase Storage"""

    @pytest.fixture
    def mock_upload_file(self):
        """Mock FastAPI UploadFile object"""
        file_content = b"test file content"
        file_obj = io.BytesIO(file_content)
        
        upload_file = Mock(spec=UploadFile)
        upload_file.filename = "test_file.txt"
        upload_file.content_type = "text/plain"
        upload_file.file = file_obj
        
        return upload_file

    @pytest.fixture
    def mock_upload_file_no_extension(self):
        """Mock FastAPI UploadFile object without extension"""
        file_content = b"test file content"
        file_obj = io.BytesIO(file_content)
        
        upload_file = Mock(spec=UploadFile)
        upload_file.filename = "testfile"
        upload_file.content_type = "text/plain"
        upload_file.file = file_obj
        
        return upload_file

    @patch('app.utils.file_upload.storage')
    @patch('app.utils.file_upload.time')
    @patch('app.utils.file_upload.uuid')
    def test_upload_to_firebase_success(self, mock_uuid, mock_time, mock_storage, mock_upload_file):
        """Test successful file upload to Firebase Storage"""
        from app.utils.file_upload import upload_to_firebase
        
        # Arrange
        mock_time.time.return_value = 1234567890
        mock_uuid_obj = Mock()
        mock_uuid_obj.__str__ = Mock(return_value="abcdef12-3456-7890-abcd-ef1234567890")
        mock_uuid.uuid4.return_value = mock_uuid_obj
        
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_blob.public_url = "https://storage.googleapis.com/bucket/uploads/1234567890_abcdef12.txt"
        
        mock_storage.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        # Act
        result = upload_to_firebase(mock_upload_file)
        
        # Assert
        assert result == "https://storage.googleapis.com/bucket/uploads/1234567890_abcdef12.txt"
        mock_bucket.blob.assert_called_once_with("uploads/1234567890_abcdef12.txt")
        mock_blob.upload_from_file.assert_called_once_with(
            mock_upload_file.file, 
            content_type=mock_upload_file.content_type
        )
        mock_blob.make_public.assert_called_once()

    @patch('app.utils.file_upload.storage')
    @patch('app.utils.file_upload.time')
    @patch('app.utils.file_upload.uuid')
    def test_upload_to_firebase_custom_folder(self, mock_uuid, mock_time, mock_storage, mock_upload_file):
        """Test file upload to custom folder"""
        from app.utils.file_upload import upload_to_firebase
        
        # Arrange
        mock_time.time.return_value = 1234567890
        mock_uuid_obj = Mock()
        mock_uuid_obj.__str__ = Mock(return_value="abcdef12-3456-7890-abcd-ef1234567890")
        mock_uuid.uuid4.return_value = mock_uuid_obj
        
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_blob.public_url = "https://storage.googleapis.com/bucket/documents/1234567890_abcdef12.txt"
        
        mock_storage.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        # Act
        result = upload_to_firebase(mock_upload_file, folder="documents")
        
        # Assert
        assert result == "https://storage.googleapis.com/bucket/documents/1234567890_abcdef12.txt"
        mock_bucket.blob.assert_called_once_with("documents/1234567890_abcdef12.txt")

    @patch('app.utils.file_upload.storage')
    @patch('app.utils.file_upload.time')
    @patch('app.utils.file_upload.uuid')
    def test_upload_to_firebase_no_extension(self, mock_uuid, mock_time, mock_storage, mock_upload_file_no_extension):
        """Test file upload without file extension"""
        from app.utils.file_upload import upload_to_firebase
        
        # Arrange
        mock_time.time.return_value = 1234567890
        mock_uuid_obj = Mock()
        mock_uuid_obj.__str__ = Mock(return_value="abcdef12-3456-7890-abcd-ef1234567890")
        mock_uuid.uuid4.return_value = mock_uuid_obj
        
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_blob.public_url = "https://storage.googleapis.com/bucket/uploads/1234567890_abcdef12"
        
        mock_storage.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        # Act
        result = upload_to_firebase(mock_upload_file_no_extension)
        
        # Assert
        assert result == "https://storage.googleapis.com/bucket/uploads/1234567890_abcdef12"
        mock_bucket.blob.assert_called_once_with("uploads/1234567890_abcdef12")

    @patch('app.utils.file_upload.storage')
    def test_delete_from_firebase_success(self, mock_storage):
        """Test successful file deletion from Firebase Storage"""
        from app.utils.file_upload import delete_from_firebase
        
        # Arrange
        file_url = "https://storage.googleapis.com/bucket-name/uploads/test_file.txt"
        mock_bucket = Mock()
        mock_blob = Mock()
        
        mock_storage.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        # Act
        result = delete_from_firebase(file_url)
        
        # Assert
        assert result is True
        mock_bucket.blob.assert_called_once_with("uploads/test_file.txt")
        mock_blob.delete.assert_called_once()

    @patch('app.utils.file_upload.storage')
    def test_delete_from_firebase_with_query_params(self, mock_storage):
        """Test file deletion with URL containing query parameters"""
        from app.utils.file_upload import delete_from_firebase
        
        # Arrange
        file_url = "https://storage.googleapis.com/bucket-name/uploads/test_file.txt?token=abc123&alt=media"
        mock_bucket = Mock()
        mock_blob = Mock()
        
        mock_storage.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        # Act
        result = delete_from_firebase(file_url)
        
        # Assert
        assert result is True
        mock_bucket.blob.assert_called_once_with("uploads/test_file.txt")
        mock_blob.delete.assert_called_once()

    def test_delete_from_firebase_invalid_url(self):
        """Test file deletion with invalid URL"""
        from app.utils.file_upload import delete_from_firebase
        
        # Act
        result = delete_from_firebase("https://example.com/invalid-url")
        
        # Assert
        assert result is False

    @patch('app.utils.file_upload.storage')
    def test_delete_from_firebase_exception(self, mock_storage):
        """Test file deletion when exception occurs"""
        from app.utils.file_upload import delete_from_firebase
        
        # Arrange
        file_url = "https://storage.googleapis.com/bucket-name/uploads/test_file.txt"
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_blob.delete.side_effect = Exception("Firebase error")
        
        mock_storage.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        # Act
        result = delete_from_firebase(file_url)
        
        # Assert
        assert result is False

    def test_delete_from_firebase_empty_url(self):
        """Test file deletion with empty URL"""
        from app.utils.file_upload import delete_from_firebase
        
        # Act
        result = delete_from_firebase("")
        
        # Assert
        assert result is False

    def test_delete_from_firebase_none_url(self):
        """Test file deletion with None URL"""
        from app.utils.file_upload import delete_from_firebase
        
        # Act
        result = delete_from_firebase(None)
        
        # Assert
        assert result is False

    @patch('app.utils.file_upload.storage')
    def test_delete_from_firebase_complex_path(self, mock_storage):
        """Test file deletion with complex nested path"""
        from app.utils.file_upload import delete_from_firebase
        
        # Arrange
        file_url = "https://storage.googleapis.com/bucket-name/users/user123/documents/subfolder/test_file.pdf"
        mock_bucket = Mock()
        mock_blob = Mock()
        
        mock_storage.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        # Act
        result = delete_from_firebase(file_url)
        
        # Assert
        assert result is True
        mock_bucket.blob.assert_called_once_with("users/user123/documents/subfolder/test_file.pdf")
        mock_blob.delete.assert_called_once()

    @patch('app.utils.file_upload.storage')
    @patch('app.utils.file_upload.time')
    @patch('app.utils.file_upload.uuid')
    def test_upload_to_firebase_storage_exception(self, mock_uuid, mock_time, mock_storage, mock_upload_file):
        """Test file upload when Firebase Storage raises exception"""
        from app.utils.file_upload import upload_to_firebase
        
        # Arrange
        mock_time.time.return_value = 1234567890
        mock_uuid.uuid4.return_value.hex = "abcdef123456"
        
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_blob.upload_from_file.side_effect = Exception("Storage error")
        
        mock_storage.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        # Act & Assert
        with pytest.raises(Exception, match="Storage error"):
            upload_to_firebase(mock_upload_file)

    @patch('app.utils.file_upload.storage')
    @patch('app.utils.file_upload.time')
    @patch('app.utils.file_upload.uuid')
    def test_filename_generation_uniqueness(self, mock_uuid, mock_time, mock_storage, mock_upload_file):
        """Test that generated filenames are unique"""
        from app.utils.file_upload import upload_to_firebase
        
        # Arrange
        mock_time.time.return_value = 1234567890
        mock_uuid_obj = Mock()
        mock_uuid_obj.__str__ = Mock(return_value="abcdef12-3456-7890-abcd-ef1234567890")
        mock_uuid.uuid4.return_value = mock_uuid_obj
        
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_blob.public_url = "https://storage.googleapis.com/bucket/uploads/1234567890_abcdef12.txt"
        
        mock_storage.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        # Act
        upload_to_firebase(mock_upload_file)
        
        # Assert - Check that both timestamp and UUID are used
        expected_filename = "uploads/1234567890_abcdef12.txt"
        mock_bucket.blob.assert_called_with(expected_filename)
        
        # Verify timestamp and UUID were called
        mock_time.time.assert_called_once()
        mock_uuid.uuid4.assert_called_once()
