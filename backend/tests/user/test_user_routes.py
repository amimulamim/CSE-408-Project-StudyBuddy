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
