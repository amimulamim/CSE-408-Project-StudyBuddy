import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException

# Mock Firebase initialization before importing app modules
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.main import app
    from app.users.schema import SecureProfileEdit
    from app.auth.firebase_auth import get_current_user
    from app.core.database import get_db

client = TestClient(app)


class TestUserProfileEdit:
    """Test user profile editing endpoint that was missing test coverage"""

    def test_edit_profile_secure_success(self):
        """Test secure profile editing successfully"""
        # Setup dependency overrides
        def mock_get_current_user():
            return {"uid": "test-uid"}
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            with patch('app.api.v1.routes.user.check_profile_rate_limit') as mock_rate_limit, \
                 patch('app.api.v1.routes.user.update_user_profile_secure') as mock_update:
                
                # Setup mocks
                mock_rate_limit.return_value = (True, None)
                
                mock_updated_user = Mock()
                mock_updated_user.uid = "test-uid"
                mock_updated_user.email = "test@example.com"
                mock_updated_user.name = "Updated Name"
                mock_updated_user.bio = "Updated bio"
                mock_updated_user.role = "student"
                mock_updated_user.institution = "Updated University"
                mock_updated_user.study_domain = "Computer Science"
                mock_updated_user.location = "Updated City"
                mock_updated_user.interests = ["ai", "machine learning"]
                mock_updated_user.is_admin = False
                mock_updated_user.is_moderator = True
                mock_updated_user.avatar = ""
                mock_updated_user.current_plan = "free"
                mock_update.return_value = mock_updated_user
                
                # Execute
                profile_data = {
                    "name": "Updated Name",
                    "bio": "Updated bio",
                    "role": "student",
                    "institution": "Updated University",
                    "study_domain": "Computer Science",
                    "location": "Updated City",
                    "interests": "+machine learning,-web development,ai",
                    "is_moderator": True
                }
                
                response = client.put("/api/v1/user/profile", json=profile_data)
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["name"] == "Updated Name"
                assert data["bio"] == "Updated bio"
                assert data["role"] == "student"
                assert data["is_moderator"] is True
                
                # Verify function calls
                mock_rate_limit.assert_called_once_with("test-uid")
                mock_update.assert_called_once()
                
        finally:
            app.dependency_overrides.clear()

    def test_edit_profile_secure_rate_limited(self):
        """Test profile editing with rate limiting"""
        def mock_get_current_user():
            return {"uid": "test-uid"}
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            with patch('app.api.v1.routes.user.check_profile_rate_limit') as mock_rate_limit:
                mock_rate_limit.return_value = (False, None)
                
                profile_data = {"name": "Updated Name"}
                response = client.put("/api/v1/user/profile", json=profile_data)
                
                assert response.status_code == 429
                assert "Rate limit exceeded" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    def test_edit_profile_secure_user_not_found(self):
        """Test profile editing when user doesn't exist"""
        def mock_get_current_user():
            return {"uid": "nonexistent-uid"}
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            with patch('app.api.v1.routes.user.check_profile_rate_limit') as mock_rate_limit, \
                 patch('app.api.v1.routes.user.update_user_profile_secure') as mock_update:
                
                mock_rate_limit.return_value = (True, None)
                mock_update.return_value = None
                
                profile_data = {"name": "Updated Name"}
                response = client.put("/api/v1/user/profile", json=profile_data)
                
                assert response.status_code == 404
                assert response.json()["detail"] == "User not found"
        finally:
            app.dependency_overrides.clear()

    def test_edit_profile_interests_array_manipulation(self):
        """Test interests field array manipulation with +/- syntax"""
        def mock_get_current_user():
            return {"uid": "test-uid"}
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            with patch('app.api.v1.routes.user.check_profile_rate_limit') as mock_rate_limit, \
                 patch('app.api.v1.routes.user.update_user_profile_secure') as mock_update:
                
                mock_rate_limit.return_value = (True, None)
                
                mock_updated_user = Mock()
                mock_updated_user.uid = "test-uid"
                mock_updated_user.email = "test@example.com"
                mock_updated_user.name = "Test User"
                mock_updated_user.bio = None
                mock_updated_user.role = "student"
                mock_updated_user.institution = ""
                mock_updated_user.study_domain = ""
                mock_updated_user.location = ""
                mock_updated_user.interests = ["ai", "data science"]
                mock_updated_user.is_admin = False
                mock_updated_user.is_moderator = False
                mock_updated_user.avatar = ""
                mock_updated_user.current_plan = "free"
                mock_update.return_value = mock_updated_user
                
                # Test complex interests manipulation
                profile_data = {
                    "interests": "+machine learning,-web development,data science"
                }
                
                response = client.put("/api/v1/user/profile", json=profile_data)
                
                assert response.status_code == 200
                # The service should have been called with the profile data
                mock_update.assert_called_once()
                call_args = mock_update.call_args[0]
                assert len(call_args) == 3  # db, uid, profile_data
                
        finally:
            app.dependency_overrides.clear()

    def test_edit_profile_moderator_self_assignment(self):
        """Test user can volunteer to become moderator"""
        def mock_get_current_user():
            return {"uid": "test-uid"}
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            with patch('app.api.v1.routes.user.check_profile_rate_limit') as mock_rate_limit, \
                 patch('app.api.v1.routes.user.update_user_profile_secure') as mock_update:
                
                mock_rate_limit.return_value = (True, None)
                
                mock_updated_user = Mock()
                mock_updated_user.uid = "test-uid"
                mock_updated_user.email = "test@example.com"
                mock_updated_user.name = "Test User"
                mock_updated_user.bio = None
                mock_updated_user.role = "student"
                mock_updated_user.institution = ""
                mock_updated_user.study_domain = ""
                mock_updated_user.location = ""
                mock_updated_user.interests = []
                mock_updated_user.is_admin = False
                mock_updated_user.is_moderator = True
                mock_updated_user.avatar = ""
                mock_updated_user.current_plan = "free"
                mock_update.return_value = mock_updated_user
                
                # Test user volunteering as moderator
                profile_data = {
                    "is_moderator": True
                }
                
                response = client.put("/api/v1/user/profile", json=profile_data)
                
                assert response.status_code == 200
                data = response.json()
                assert data["is_moderator"] is True
                
        finally:
            app.dependency_overrides.clear()

    def test_edit_profile_unauthorized(self):
        """Test profile editing without authentication"""
        def mock_get_current_user():
            raise HTTPException(status_code=401, detail="Unauthorized")
            
        def mock_get_db():
            return Mock()
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            profile_data = {"name": "Updated Name"}
            response = client.put("/api/v1/user/profile", json=profile_data)
            
            assert response.status_code == 401
        finally:
            app.dependency_overrides.clear()
