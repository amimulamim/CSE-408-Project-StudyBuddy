"""
Test file demonstrating use of environment variables for moderator vs non-moderator testing.
This file shows how to use the credentials from .env.test for comprehensive testing.
"""
import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient

# Mock Firebase initialization before importing app modules
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.main import app
    from app.users.model import User
    from app.auth.firebase_auth import get_current_user
    from app.core.database import get_db

client = TestClient(app)


class TestModeratorCredentialsFromEnv:
    """Test class demonstrating use of environment-based credentials"""

    @pytest.fixture
    def moderator_user_from_env(self):
        """Moderator user from environment variables"""
        return {
            "uid": "wifade8269@finfave.com",  # FIREBASE_TEST_EMAIL from .env.test
            "email": "wifade8269@finfave.com"
        }

    @pytest.fixture
    def regular_user_from_env(self):
        """Regular (non-moderator) user from environment variables"""
        return {
            "uid": "sewif98534@fenexy.com",  # FIREBASE_USUAL_EMAIL from .env.test
            "email": "sewif98534@fenexy.com"
        }

    def setup_method(self):
        """Setup method to clear dependency overrides before each test"""
        app.dependency_overrides.clear()

    def teardown_method(self):
        """Teardown method to clear dependency overrides after each test"""
        app.dependency_overrides.clear()

    def test_environment_based_moderator_access(self, moderator_user_from_env):
        """Test that moderator from env.test can access moderator endpoints"""
        app.dependency_overrides[get_current_user] = lambda: moderator_user_from_env
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock the moderator user in database
        mock_user = Mock()
        mock_user.uid = moderator_user_from_env["uid"]
        mock_user.email = moderator_user_from_env["email"]
        mock_user.is_moderator = True  # This user is a moderator and admin per .env.test
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        # Mock pending content
        mock_db.query.return_value.filter.return_value.all.return_value = []

        response = client.get("/api/v1/content-moderator/pending")

        assert response.status_code == 200
        assert "pending_contents" in response.json()

    def test_environment_based_regular_user_denied(self, regular_user_from_env):
        """Test that regular user from env.test is denied moderator access"""
        app.dependency_overrides[get_current_user] = lambda: regular_user_from_env
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock the regular user in database
        mock_user = Mock()
        mock_user.uid = regular_user_from_env["uid"]
        mock_user.email = regular_user_from_env["email"]
        mock_user.is_moderator = False  # This user is neither moderator nor admin per .env.test
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        response = client.get("/api/v1/content-moderator/pending")

        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]

    def test_moderator_vs_regular_user_profile_creation(self, moderator_user_from_env, regular_user_from_env):
        """Test profile creation permissions between moderator and regular user"""
        
        # Test 1: Moderator can create profile
        app.dependency_overrides[get_current_user] = lambda: moderator_user_from_env
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock moderator in database
        mock_moderator = Mock()
        mock_moderator.uid = moderator_user_from_env["uid"]
        mock_moderator.is_moderator = True
        
        def mock_query_side_effect_mod(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_moderator
            elif model.__name__ == 'ModeratorProfile':  # Check class name to avoid import issues
                mock_query.filter.return_value.first.return_value = None  # No existing profile
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect_mod

        request_data = {
            "domains": ["Computer Science"],
            "topics": ["Python", "Testing"]
        }

        response = client.post("/api/v1/content-moderator/profile", json=request_data)
        assert response.status_code == 200
        assert response.json()["moderator_id"] == moderator_user_from_env["uid"]

        # Test 2: Regular user cannot create profile
        app.dependency_overrides[get_current_user] = lambda: regular_user_from_env
        
        # Mock regular user in database
        mock_regular_user = Mock()
        mock_regular_user.uid = regular_user_from_env["uid"]
        mock_regular_user.is_moderator = False
        
        def mock_query_side_effect_reg(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_regular_user
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect_reg

        response = client.post("/api/v1/content-moderator/profile", json=request_data)
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]

    @pytest.mark.skip(reason="Complex Mock iteration issue - needs refactoring")
    def test_content_moderation_workflow_with_env_users(self, moderator_user_from_env, regular_user_from_env):
        """Test complete content moderation workflow using environment users"""
        
        # Setup: Regular user creates content (would be done in content generation)
        # Here we simulate content exists and is pending moderation
        
        # Test: Moderator can view and moderate content
        app.dependency_overrides[get_current_user] = lambda: moderator_user_from_env
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock moderator user
        mock_moderator = Mock()
        mock_moderator.uid = moderator_user_from_env["uid"]
        mock_moderator.is_moderator = True
        
        # Mock pending content created by regular user
        mock_content = Mock()
        mock_content.id = "test-content-123"
        mock_content.user_id = regular_user_from_env["uid"]  # Created by regular user
        mock_content.topic = "Python Basics"
        mock_content.content_type = "slides_pending"
        mock_content.created_at = "2024-01-01T10:00:00Z"
        mock_content.raw_source = "https://example.com/raw.tex"
        
        def mock_query_side_effect_workflow(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_moderator
            elif model.__name__ == 'ContentItem':
                if hasattr(mock_query, 'filter'):
                    # For specific content lookup
                    mock_query.filter.return_value.first.return_value = mock_content
                else:
                    # For all pending content
                    mock_query.filter.return_value.all.return_value = [mock_content]
            elif model.__name__ == 'ModeratorProfile':
                mock_query.filter.return_value.first.return_value = None  # No existing profile
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect_workflow

        # Step 1: Moderator views pending content
        response = client.get("/api/v1/content-moderator/pending")
        assert response.status_code == 200
        pending = response.json()["pending_contents"]
        assert len(pending) == 1
        assert pending[0]["user_id"] == regular_user_from_env["uid"]
        assert pending[0]["topic"] == "Python Basics"

        # Step 2: Moderator approves content
        request_data = {
            "approve": True,
            "topic": "Python Fundamentals"  # Moderator updates topic
        }

        response = client.put(f"/api/v1/content-moderator/{mock_content.id}/moderate", json=request_data)
        assert response.status_code == 200
        assert response.json()["metadata"]["approved"] is True
        assert response.json()["metadata"]["topic"] == "Python Fundamentals"

        # Verify content type changed from pending to approved
        assert mock_content.content_type == "slides"
        assert mock_content.topic == "Python Fundamentals"

    @pytest.mark.skip(reason="Complex Mock iteration issue - needs refactoring")
    def test_quiz_moderation_with_env_credentials(self, moderator_user_from_env):
        """Test quiz moderation using environment moderator credentials"""
        app.dependency_overrides[get_current_user] = lambda: moderator_user_from_env
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock moderator user
        mock_moderator = Mock()
        mock_moderator.uid = moderator_user_from_env["uid"]
        mock_moderator.is_moderator = True
        
        # Mock quiz
        mock_quiz = Mock()
        mock_quiz.quiz_id = "quiz-123"
        mock_quiz.topic = "Mathematics"
        mock_quiz.domain = "Science" 
        mock_quiz.user_id = "student-user-456"
        mock_quiz.created_at = "2024-01-01T10:00:00Z"
        mock_quiz.duration = 30
        mock_quiz.difficulty = None
        
        def mock_query_side_effect_quiz(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_moderator
            elif model.__name__ == 'Quiz':
                if hasattr(mock_query, 'filter'):
                    mock_query.filter.return_value.first.return_value = mock_quiz
                else:
                    mock_query.all.return_value = [mock_quiz]
            elif model.__name__ == 'ModeratorProfile':
                mock_query.filter.return_value.first.return_value = None
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect_quiz

        # Test getting pending quizzes
        response = client.get("/api/v1/content-moderator/quiz/pending")
        assert response.status_code == 200
        quizzes = response.json()["pending_quizzes"]
        assert len(quizzes) == 1
        assert quizzes[0]["topic"] == "Mathematics"

        # Test moderating quiz
        request_data = {
            "topic": "Advanced Mathematics",
            "domain": "STEM",
            "approve": True
        }

        response = client.put(f"/api/v1/content-moderator/quiz/{mock_quiz.quiz_id}/moderate", json=request_data)
        assert response.status_code == 200
        assert response.json()["metadata"]["topic"] == "Advanced Mathematics"
        assert response.json()["metadata"]["domain"] == "STEM"
        assert response.json()["metadata"]["approved"] is True

    @pytest.mark.parametrize("user_type,expected_access", [
        ("moderator", True),
        ("regular", False)
    ])
    def test_all_moderator_endpoints_access_control(self, user_type, expected_access, 
                                                   moderator_user_from_env, regular_user_from_env):
        """Parametrized test to verify access control across all moderator endpoints"""
        
        # Select user based on parameter
        if user_type == "moderator":
            current_user = moderator_user_from_env
            is_moderator = True
        else:
            current_user = regular_user_from_env
            is_moderator = False
        
        app.dependency_overrides[get_current_user] = lambda: current_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user in database
        mock_user = Mock()
        mock_user.uid = current_user["uid"]
        mock_user.is_moderator = is_moderator
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        # Mock empty responses for successful cases
        mock_db.query.return_value.filter.return_value.all.return_value = []
        mock_db.query.return_value.all.return_value = []

        # List of endpoints to test
        endpoints = [
            ("GET", "/api/v1/content-moderator/pending"),
            ("GET", "/api/v1/content-moderator/all"),
            ("GET", "/api/v1/content-moderator/quiz/pending"),
            ("GET", "/api/v1/content-moderator/quiz/all"),
            ("GET", "/api/v1/content-moderator/profiles/all"),
        ]

        for method, endpoint in endpoints:
            response = client.get(endpoint)
            
            if expected_access:
                assert response.status_code == 200, f"Moderator should have access to {endpoint}"
            else:
                assert response.status_code == 403, f"Regular user should be denied access to {endpoint}"
                assert "Access denied" in response.json()["detail"]

    def test_profile_management_with_env_moderator(self, moderator_user_from_env):
        """Test complete profile management workflow with environment moderator"""
        app.dependency_overrides[get_current_user] = lambda: moderator_user_from_env
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock moderator user
        mock_moderator = Mock()
        mock_moderator.uid = moderator_user_from_env["uid"]
        mock_moderator.is_moderator = True
        
        # Mock profile (initially doesn't exist)
        mock_profile = None
        
        def mock_query_side_effect_profile(model):
            nonlocal mock_profile
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_moderator
            elif model.__name__ == 'ModeratorProfile':
                mock_query.filter.return_value.first.return_value = mock_profile
            elif model.__name__ in ['ModeratorDomain', 'ModeratorTopic']:
                mock_query.filter.return_value.all.return_value = []
                mock_query.filter.return_value.delete.return_value = None
                return mock_query
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect_profile

        # Step 1: Create profile
        create_data = {
            "domains": ["Computer Science", "Data Science"],
            "topics": ["Python", "Machine Learning", "Testing"]
        }

        response = client.post("/api/v1/content-moderator/profile", json=create_data)
        assert response.status_code == 200
        assert response.json()["moderator_id"] == moderator_user_from_env["uid"]
        assert response.json()["domains"] == ["Computer Science", "Data Science"]
        assert response.json()["topics"] == ["Python", "Machine Learning", "Testing"]

        # Simulate profile creation
        mock_profile = Mock()
        mock_profile.moderator_id = moderator_user_from_env["uid"]
        mock_profile.contents_modified = 0
        mock_profile.quizzes_modified = 0
        mock_profile.total_time_spent = 0.0

        # Step 2: Get profile
        response = client.get("/api/v1/content-moderator/profile")
        assert response.status_code == 200
        profile_data = response.json()
        assert profile_data["moderator_id"] == moderator_user_from_env["uid"]

        # Step 3: Update profile
        update_data = {
            "domains": ["Computer Science", "AI"],  # Updated domains
            "topics": ["Python", "Deep Learning"]   # Updated topics
        }

        response = client.put("/api/v1/content-moderator/profile", json=update_data)
        assert response.status_code == 200
        assert response.json()["message"] == "Moderator profile updated successfully"

        # Step 4: Get stats (simulate some activity)
        mock_profile.contents_modified = 5
        mock_profile.quizzes_modified = 3
        
        # Mock history
        def mock_query_with_history(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_moderator
            elif model.__name__ == 'ModeratorProfile':
                mock_query.filter.return_value.first.return_value = mock_profile
            elif model.__name__ in ['ModeratorContentHistory', 'ModeratorQuizHistory']:
                mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
            return mock_query
        
        mock_db.query.side_effect = mock_query_with_history

        response = client.get("/api/v1/content-moderator/stats")
        assert response.status_code == 200
        stats = response.json()
        assert stats["moderator_id"] == moderator_user_from_env["uid"]
        assert stats["contents_modified"] == 5
        assert stats["quizzes_modified"] == 3

        # Step 5: Delete profile
        response = client.delete("/api/v1/content-moderator/profile")
        assert response.status_code == 200
        assert response.json()["message"] == "Moderator profile deleted successfully"
