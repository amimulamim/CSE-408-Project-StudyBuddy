import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException

# Mock Firebase initialization before importing app modules
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.main import app
    from app.users.schema import UserProfile
    from app.users.model import User
    from app.auth.firebase_auth import get_current_user
    from app.core.database import get_db

client = TestClient(app)


class TestUserRoutes:
    """Test user API routes"""

    def test_get_profile_success(self):
        """Test getting user profile successfully"""
        # Setup dependency overrides
        def mock_get_current_user():
            return {"uid": "test-uid"}
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            with patch('app.api.v1.routes.user.get_user_by_uid') as mock_get_user:
                # Mock user data
                mock_user = Mock()
                mock_user.uid = "test-uid"
                mock_user.email = "test@example.com"
                mock_user.name = "Test User"
                mock_user.bio = None
                mock_user.institution = "Test University"
                mock_user.role = "student"
                mock_user.avatar = ""
                mock_user.current_plan = "free"
                mock_user.location = "Test City"
                mock_user.study_domain = "Computer Science"
                mock_user.interests = ["programming", "ai"]
                mock_user.is_admin = False
                mock_user.is_moderator = False
                mock_get_user.return_value = mock_user

                # Execute
                response = client.get("/api/v1/user/profile")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["uid"] == "test-uid"
                assert data["email"] == "test@example.com"
                assert data["name"] == "Test User"
                assert data["interests"] == ["programming", "ai"]
        finally:
            # Clean up dependency overrides
            app.dependency_overrides.clear()

    def test_get_profile_user_not_found(self):
        """Test getting profile when user doesn't exist"""
        def mock_get_current_user():
            return {"uid": "nonexistent-uid"}
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            with patch('app.api.v1.routes.user.get_user_by_uid') as mock_get_user:
                mock_get_user.return_value = None
                
                response = client.get("/api/v1/user/profile")
                
                assert response.status_code == 404
                assert response.json()["detail"] == "User not found"
        finally:
            app.dependency_overrides.clear()

    def test_get_profile_auth_error(self):
        """Test getting profile with authentication error"""
        def mock_get_current_user():
            raise HTTPException(status_code=401, detail="Unauthorized")
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            response = client.get("/api/v1/user/profile")
            
            assert response.status_code == 401
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_upload_profile_photo_success(self):
        """Test uploading profile photo successfully"""
        # Create a single mock database session to use consistently
        mock_db_session = Mock()
        
        def mock_get_current_user():
            return {"uid": "test-uid"}
            
        def mock_get_db():
            return mock_db_session
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            with patch('app.api.v1.routes.user.check_profile_rate_limit') as mock_rate_limit, \
                 patch('app.api.v1.routes.user.validate_and_upload_avatar') as mock_upload, \
                 patch('app.api.v1.routes.user.get_user_by_uid') as mock_get_user, \
                 patch('app.api.v1.routes.user.update_user_avatar') as mock_update_avatar, \
                 patch('app.utils.file_upload.delete_from_firebase') as mock_delete:
                
                # Setup mocks
                mock_rate_limit.return_value = (True, None)
                mock_upload.return_value = "https://storage.googleapis.com/bucket/avatars/test.jpg"
                
                mock_user = Mock()
                mock_user.avatar = "https://storage.googleapis.com/bucket/avatars/old.jpg"
                mock_get_user.return_value = mock_user
                
                mock_updated_user = Mock()
                mock_updated_user.avatar = "https://storage.googleapis.com/bucket/avatars/test.jpg"
                mock_update_avatar.return_value = mock_updated_user
                
                # Create test file
                test_file_content = b"fake image content"
                files = {
                    "avatar": ("test.jpg", test_file_content, "image/jpeg")
                }
                
                response = client.put("/api/v1/user/profile/avatar", files=files)
                
                assert response.status_code == 200
                response_data = response.json()
                assert "avatar_url" in response_data
                assert "message" in response_data
                assert response_data["avatar_url"] == "https://storage.googleapis.com/bucket/avatars/test.jpg"
                assert response_data["message"] == "Profile photo updated successfully"
                
                # Verify function calls
                mock_rate_limit.assert_called_once_with("test-uid")
                mock_upload.assert_called_once()
                mock_get_user.assert_called_once_with(mock_db_session, "test-uid")
                mock_update_avatar.assert_called_once_with(
                    mock_db_session, 
                    "test-uid", 
                    "https://storage.googleapis.com/bucket/avatars/test.jpg"
                )
                mock_delete.assert_called_once_with("https://storage.googleapis.com/bucket/avatars/old.jpg")
                
        finally:
            app.dependency_overrides.clear()

    def test_upload_profile_photo_rate_limited(self):
        """Test upload profile photo with rate limiting"""
        mock_db_session = Mock()
        
        def mock_get_current_user():
            return {"uid": "test-uid"}
            
        def mock_get_db():
            return mock_db_session
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            with patch('app.api.v1.routes.user.check_profile_rate_limit') as mock_rate_limit:
                mock_rate_limit.return_value = (False, None)
                
                test_file_content = b"fake image content"
                files = {
                    "avatar": ("test.jpg", test_file_content, "image/jpeg")
                }
                
                response = client.put("/api/v1/user/profile/avatar", files=files)
                
                assert response.status_code == 429
                assert "Rate limit exceeded" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    def test_upload_profile_photo_user_not_found(self):
        """Test upload profile photo when user not found"""
        mock_db_session = Mock()
        
        def mock_get_current_user():
            return {"uid": "test-uid"}
            
        def mock_get_db():
            return mock_db_session
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            with patch('app.api.v1.routes.user.check_profile_rate_limit') as mock_rate_limit, \
                 patch('app.api.v1.routes.user.validate_and_upload_avatar') as mock_upload, \
                 patch('app.api.v1.routes.user.get_user_by_uid') as mock_get_user:
                
                mock_rate_limit.return_value = (True, None)
                mock_upload.return_value = "https://storage.googleapis.com/bucket/avatars/test.jpg"
                mock_get_user.return_value = None
                
                test_file_content = b"fake image content"
                files = {
                    "avatar": ("test.jpg", test_file_content, "image/jpeg")
                }
                
                response = client.put("/api/v1/user/profile/avatar", files=files)
                
                assert response.status_code == 404
                assert response.json()["detail"] == "User not found"
        finally:
            app.dependency_overrides.clear()

    def test_delete_profile_photo_success(self):
        """Test deleting profile photo successfully"""
        mock_db_session = Mock()
        
        def mock_get_current_user():
            return {"uid": "test-uid"}
            
        def mock_get_db():
            return mock_db_session
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            with patch('app.api.v1.routes.user.check_profile_rate_limit') as mock_rate_limit, \
                 patch('app.api.v1.routes.user.delete_user_avatar') as mock_delete_avatar:
                
                # Setup mocks
                mock_rate_limit.return_value = (True, None)
                
                mock_updated_user = Mock()
                mock_updated_user.avatar = ""
                mock_delete_avatar.return_value = mock_updated_user
                
                response = client.delete("/api/v1/user/profile/avatar")
                
                assert response.status_code == 200
                response_data = response.json()
                assert "message" in response_data
                assert "avatar_url" in response_data
                assert response_data["message"] == "Profile photo deleted successfully"
                assert response_data["avatar_url"] == ""
                
                # Verify function calls
                mock_rate_limit.assert_called_once_with("test-uid")
                mock_delete_avatar.assert_called_once_with(mock_db_session, "test-uid")
                
        finally:
            app.dependency_overrides.clear()

    def test_delete_profile_photo_rate_limited(self):
        """Test delete profile photo with rate limiting"""
        mock_db_session = Mock()
        
        def mock_get_current_user():
            return {"uid": "test-uid"}
            
        def mock_get_db():
            return mock_db_session
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            with patch('app.api.v1.routes.user.check_profile_rate_limit') as mock_rate_limit:
                mock_rate_limit.return_value = (False, None)
                
                response = client.delete("/api/v1/user/profile/avatar")
                
                assert response.status_code == 429
                assert "Rate limit exceeded" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    def test_delete_profile_photo_user_not_found(self):
        """Test delete profile photo when user not found"""
        mock_db_session = Mock()
        
        def mock_get_current_user():
            return {"uid": "test-uid"}
            
        def mock_get_db():
            return mock_db_session
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            with patch('app.api.v1.routes.user.check_profile_rate_limit') as mock_rate_limit, \
                 patch('app.api.v1.routes.user.delete_user_avatar') as mock_delete_avatar:
                
                mock_rate_limit.return_value = (True, None)
                mock_delete_avatar.return_value = None
                
                response = client.delete("/api/v1/user/profile/avatar")
                
                assert response.status_code == 404
                assert response.json()["detail"] == "User not found"
        finally:
            app.dependency_overrides.clear()
