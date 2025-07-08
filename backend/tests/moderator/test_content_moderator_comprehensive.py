import pytest
import json
import uuid
import tempfile
import asyncio
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from datetime import datetime, timezone
from sqlalchemy.exc import SQLAlchemyError

# Mock Firebase initialization before importing app modules
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.main import app
    from app.content_generator.models import ContentItem
    from app.quiz_generator.models import Quiz
    from app.users.model import User
    from app.content_moderator.models import (
        ModeratorProfile, ModeratorDomain, ModeratorTopic,
        ModeratorContentHistory, ModeratorQuizHistory
    )
    from app.auth.firebase_auth import get_current_user
    from app.core.database import get_db

client = TestClient(app)


class TestContentModeratorComprehensive:
    """Comprehensive tests for content moderator routes to improve coverage"""

    @pytest.fixture
    def mock_moderator_user(self):
        """Mock moderator user data using env test credentials"""
        return {"uid": "wifade8269@finfave.com", "email": "wifade8269@finfave.com"}

    @pytest.fixture
    def mock_non_moderator_user(self):
        """Mock non-moderator user data using env test credentials"""
        return {"uid": "sewif98534@fenexy.com", "email": "sewif98534@fenexy.com"}

    @pytest.fixture
    def mock_admin_user(self):
        """Mock admin user data"""
        return {"uid": "admin-123", "email": "admin@example.com"}

    def setup_method(self):
        """Setup method to clear dependency overrides before each test"""
        app.dependency_overrides.clear()

    def teardown_method(self):
        """Teardown method to clear dependency overrides after each test"""
        app.dependency_overrides.clear()

    # Error handling tests
    def test_get_pending_content_internal_server_error(self, mock_moderator_user):
        """Test handling of internal server error when fetching pending content"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        # Mock database error
        mock_db.query.side_effect = SQLAlchemyError("Database connection failed")

        response = client.get("/api/v1/content-moderator/pending")

        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()

    def test_get_content_raw_content_fetch_error(self, mock_moderator_user):
        """Test error handling when fetching raw content from Firebase URL fails"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock content
        mock_content = Mock()
        mock_content.id = "test-id"
        mock_content.content_type = "slides"
        mock_content.raw_source = "https://example.com/raw.tex"
        mock_content.topic = "Test Topic"
        mock_content.created_at = datetime.now(timezone.utc)
        mock_content.user_id = "user-123"
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = mock_content
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        with patch('requests.get') as mock_requests:
            # Mock failed HTTP request
            mock_requests.side_effect = Exception("Network error")

            response = client.get("/api/v1/content-moderator/test-id/raw_content")

        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()

    def test_get_content_raw_content_empty_raw_source(self, mock_moderator_user):
        """Test raw content retrieval when raw_source is empty"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock content with empty raw_source
        mock_content = Mock()
        mock_content.id = "test-id"
        mock_content.content_type = "slides"
        mock_content.raw_source = ""
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = mock_content
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        response = client.get("/api/v1/content-moderator/test-id/raw_content")

        assert response.status_code == 404
        assert "Raw content not found" in response.json()["detail"]

    def test_edit_content_raw_content_firebase_upload_error(self, mock_moderator_user):
        """Test error handling during Firebase upload in edit raw content"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock content
        mock_content = Mock()
        mock_content.id = "test-id"
        mock_content.content_type = "slides"
        mock_content.raw_source = "https://example.com/existing.tex"
        mock_content.user_id = "user-123"
        mock_content.topic = "Test Topic"
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = mock_content
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        request_data = {
            "raw_content": "\\documentclass{beamer}\\begin{document}\\end{document}"
        }

        with patch('firebase_admin.storage.bucket') as mock_bucket:
            # Mock Firebase bucket error
            mock_bucket.side_effect = Exception("Firebase error")

            response = client.put("/api/v1/content-moderator/test-id/raw_content", json=request_data)

        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()

    def test_moderate_content_invalid_content_url(self, mock_moderator_user):
        """Test moderate content with invalid content URL format"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock content
        mock_content = Mock()
        mock_content.id = "test-id"
        mock_content.content_type = "slides_pending"
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = mock_content
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        request_data = {
            "content_url": "https://invalid-url.com/file.pdf"  # Not a Firebase URL
        }

        with patch('firebase_admin.storage.bucket') as mock_bucket:
            mock_bucket.return_value.name = "test-bucket"

            response = client.put("/api/v1/content-moderator/test-id/moderate", json=request_data)

        assert response.status_code == 400
        assert "Invalid content_url format" in response.json()["detail"]

    def test_moderate_content_database_rollback(self, mock_moderator_user):
        """Test database rollback on error during content moderation"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock content
        mock_content = Mock()
        mock_content.id = "test-id"
        mock_content.content_type = "slides_pending"
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = mock_content
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect
        mock_db.commit.side_effect = SQLAlchemyError("Database error")

        request_data = {"approve": True}

        response = client.put("/api/v1/content-moderator/test-id/moderate", json=request_data)

        assert response.status_code == 500
        mock_db.rollback.assert_called()

    def test_create_moderator_profile_for_another_user(self, mock_moderator_user):
        """Test creating moderator profile for another user"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock current user as moderator
        mock_current_user = Mock()
        mock_current_user.uid = mock_moderator_user["uid"]
        mock_current_user.is_moderator = True
        
        # Mock target user as moderator
        mock_target_user = Mock()
        mock_target_user.uid = "target-moderator-123"
        mock_target_user.is_moderator = True
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                # Return different users based on the filter
                def mock_filter(condition):
                    mock_filter_result = Mock()
                    if "target-moderator-123" in str(condition):
                        mock_filter_result.first.return_value = mock_target_user
                    else:
                        mock_filter_result.first.return_value = mock_current_user
                    return mock_filter_result
                mock_query.filter = mock_filter
                return mock_query
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None  # No existing profile
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        request_data = {
            "moderator_id": "target-moderator-123",
            "domains": ["Computer Science"],
            "topics": ["Python"]
        }

        response = client.post("/api/v1/content-moderator/profile", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["moderator_id"] == "target-moderator-123"
        assert data["created_by"] == mock_moderator_user["uid"]

    def test_create_moderator_profile_target_not_moderator(self, mock_moderator_user):
        """Test creating profile for user who is not a moderator"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock current user as moderator
        mock_current_user = Mock()
        mock_current_user.uid = mock_moderator_user["uid"]
        mock_current_user.is_moderator = True
        
        # Mock target user as non-moderator
        mock_target_user = Mock()
        mock_target_user.uid = "target-user-123"
        mock_target_user.is_moderator = False
        
        # Track call count to handle multiple User queries
        user_query_call_count = 0
        
        def mock_query_side_effect(model):
            nonlocal user_query_call_count
            mock_query = Mock()
            if model == User:
                user_query_call_count += 1
                if user_query_call_count == 1:
                    # First call: check_moderator_access
                    mock_query.filter.return_value.first.return_value = mock_current_user
                else:
                    # Second call: target user lookup
                    mock_query.filter.return_value.first.return_value = mock_target_user
                return mock_query
            elif model == ModeratorProfile:
                # No existing profile
                mock_query.filter.return_value.first.return_value = None
                return mock_query
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        request_data = {
            "moderator_id": "target-user-123",
            "domains": ["Computer Science"],
            "topics": ["Python"]
        }

        response = client.post("/api/v1/content-moderator/profile", json=request_data)

        assert response.status_code == 400
        assert "Target user is not a moderator" in response.json()["detail"]

    def test_create_moderator_profile_target_not_found(self, mock_moderator_user):
        """Test creating profile for non-existent user"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock current user as moderator
        mock_current_user = Mock()
        mock_current_user.uid = mock_moderator_user["uid"]
        mock_current_user.is_moderator = True
        
        # Track call count to handle multiple User queries
        user_query_call_count = 0
        
        def mock_query_side_effect(model):
            nonlocal user_query_call_count
            mock_query = Mock()
            if model == User:
                user_query_call_count += 1
                if user_query_call_count == 1:
                    # First call: check_moderator_access
                    mock_query.filter.return_value.first.return_value = mock_current_user
                else:
                    # Second call: target user lookup (not found)
                    mock_query.filter.return_value.first.return_value = None
                return mock_query
            elif model == ModeratorProfile:
                # No existing profile
                mock_query.filter.return_value.first.return_value = None
                return mock_query
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        request_data = {
            "moderator_id": "nonexistent-user",
            "domains": ["Computer Science"],
            "topics": ["Python"]
        }

        response = client.post("/api/v1/content-moderator/profile", json=request_data)

        assert response.status_code == 404
        assert "Target user not found" in response.json()["detail"]

    def test_get_moderator_profile_for_another_user(self, mock_moderator_user):
        """Test getting moderator profile for another user"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock current user as moderator
        mock_current_user = Mock()
        mock_current_user.uid = mock_moderator_user["uid"]
        mock_current_user.is_moderator = True
        
        # Mock target user as moderator
        mock_target_user = Mock()
        mock_target_user.uid = "target-moderator-123"
        mock_target_user.is_moderator = True
        
        # Mock profile
        mock_profile = Mock()
        mock_profile.moderator_id = "target-moderator-123"
        mock_profile.contents_modified = 10
        mock_profile.quizzes_modified = 5
        mock_profile.total_time_spent = 200.0
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                def mock_filter(condition):
                    mock_filter_result = Mock()
                    if "target-moderator-123" in str(condition):
                        mock_filter_result.first.return_value = mock_target_user
                    else:
                        mock_filter_result.first.return_value = mock_current_user
                    return mock_filter_result
                mock_query.filter = mock_filter
                return mock_query
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = mock_profile
            elif model in [ModeratorDomain, ModeratorTopic]:
                mock_query.filter.return_value.all.return_value = []
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        response = client.get("/api/v1/content-moderator/profile?moderator_id=target-moderator-123")

        assert response.status_code == 200
        data = response.json()
        assert data["moderator_id"] == "target-moderator-123"

    def test_get_moderator_profile_not_found(self, mock_moderator_user):
        """Test getting non-existent moderator profile"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None  # Profile not found
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        response = client.get("/api/v1/content-moderator/profile")

        assert response.status_code == 404
        assert "Moderator profile not found" in response.json()["detail"]

    def test_update_moderator_profile_not_found(self, mock_moderator_user):
        """Test updating non-existent moderator profile"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None  # Profile not found
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        request_data = {
            "domains": ["New Domain"],
            "topics": ["New Topic"]
        }

        response = client.put("/api/v1/content-moderator/profile", json=request_data)

        assert response.status_code == 404
        assert "Moderator profile not found" in response.json()["detail"]

    def test_update_other_moderator_profile_forbidden(self, mock_moderator_user):
        """Test updating another moderator's profile (should be forbidden)"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        request_data = {
            "domains": ["New Domain"],
            "topics": ["New Topic"]
        }

        response = client.put("/api/v1/content-moderator/profile/other-moderator-123", json=request_data)

        assert response.status_code == 403
        assert "You can only update your own profile" in response.json()["detail"]

    def test_get_moderator_stats_not_found(self, mock_moderator_user):
        """Test getting stats for non-existent moderator profile"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None  # Profile not found
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        response = client.get("/api/v1/content-moderator/stats")

        assert response.status_code == 404
        assert "Moderator profile not found" in response.json()["detail"]

    def test_moderate_quiz_not_found(self, mock_moderator_user):
        """Test moderating non-existent quiz"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == Quiz:
                mock_query.filter.return_value.first.return_value = None  # Quiz not found
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        request_data = {"approve": True}

        response = client.put("/api/v1/content-moderator/quiz/nonexistent-quiz/moderate", json=request_data)

        assert response.status_code == 404
        assert "Quiz not found" in response.json()["detail"]

    def test_get_all_moderator_profiles_no_profiles(self, mock_moderator_user):
        """Test retrieval when no moderator profiles exist"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ModeratorProfile:
                mock_query.all.return_value = []  # No profiles
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        response = client.get("/api/v1/content-moderator/profiles/all")

        assert response.status_code == 200
        data = response.json()
        assert "moderator_profiles" in data
        assert data["total_count"] == 0
        assert len(data["moderator_profiles"]) == 0

    def test_delete_moderator_profile_not_found(self, mock_moderator_user):
        """Test deleting non-existent moderator profile"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None  # Profile not found
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        response = client.delete("/api/v1/content-moderator/profile")

        assert response.status_code == 404
        assert "Moderator profile not found" in response.json()["detail"]

    # LaTeX compilation edge cases
    def test_compile_latex_to_pdf_timeout(self):
        """Test LaTeX compilation timeout"""
        from app.api.v1.routes.contentModerator import compile_latex_to_pdf
        
        latex_content = "\\documentclass{beamer}\\begin{document}\\end{document}"
        topic = "Test Topic"
        
        with patch('tempfile.TemporaryDirectory') as mock_tempdir, \
             patch('asyncio.to_thread') as mock_to_thread:
            
            # Mock temporary directory
            mock_temp_context = Mock()
            mock_temp_context.__enter__ = Mock(return_value="/tmp/test")
            mock_temp_context.__exit__ = Mock(return_value=None)
            mock_tempdir.return_value = mock_temp_context
            
            # Mock timeout
            mock_to_thread.side_effect = asyncio.TimeoutError("Compilation timeout")
            
            with pytest.raises(Exception, match="Error compiling LaTeX"):
                asyncio.run(compile_latex_to_pdf(latex_content, topic))

    def test_compile_latex_to_pdf_no_output_file(self):
        """Test LaTeX compilation when output file is not created"""
        from app.api.v1.routes.contentModerator import compile_latex_to_pdf
        
        latex_content = "\\documentclass{beamer}\\begin{document}\\end{document}"
        topic = "Test Topic"
        
        with patch('tempfile.TemporaryDirectory') as mock_tempdir, \
             patch('asyncio.to_thread') as mock_to_thread, \
             patch('os.path.exists', return_value=False):  # PDF file not created
            
            # Mock temporary directory
            mock_temp_context = Mock()
            mock_temp_context.__enter__ = Mock(return_value="/tmp/test")
            mock_temp_context.__exit__ = Mock(return_value=None)
            mock_tempdir.return_value = mock_temp_context
            
            # Mock successful process but no output file
            mock_process = Mock()
            mock_process.returncode = 0
            mock_to_thread.return_value = mock_process
            
            with pytest.raises(Exception, match="Error compiling LaTeX"):
                asyncio.run(compile_latex_to_pdf(latex_content, topic))

    # Track moderation activity edge cases
    def test_track_moderation_activity_existing_profile(self, mock_moderator_user):
        """Test tracking activity with existing moderator profile"""
        from app.api.v1.routes.contentModerator import track_moderation_activity
        
        mock_db = Mock()
        
        # Mock existing profile
        mock_profile = Mock()
        mock_profile.contents_modified = 5
        mock_profile.quizzes_modified = 3
        mock_db.query.return_value.filter.return_value.first.return_value = mock_profile
        
        # Test the function directly
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(track_moderation_activity(
                moderator_id=mock_moderator_user["uid"],
                db=mock_db,
                content_id="content-123"
            ))
        finally:
            loop.close()
        
        # Should have attempted to add content history and commit
        mock_db.add.assert_called()
        mock_db.commit.assert_called()

    def test_track_moderation_activity_database_error(self, mock_moderator_user):
        """Test track moderation activity with database error"""
        from app.api.v1.routes.contentModerator import track_moderation_activity
        
        mock_db = Mock()
        mock_db.query.side_effect = SQLAlchemyError("Database error")
        
        # Should not raise exception (error is caught and logged)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(track_moderation_activity(
                moderator_id=mock_moderator_user["uid"],
                db=mock_db,
                content_id="content-123"
            ))
        finally:
            loop.close()
        
        mock_db.rollback.assert_called()

    # Additional edge cases for better coverage
    def test_edit_content_raw_content_invalid_content_type(self, mock_moderator_user):
        """Test editing raw content with invalid content type"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock content with invalid type
        mock_content = Mock()
        mock_content.id = "test-id"
        mock_content.content_type = "quiz"  # Not slides/slides_pending
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = mock_content
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        request_data = {
            "raw_content": "\\documentclass{beamer}\\begin{document}\\end{document}"
        }

        response = client.put("/api/v1/content-moderator/test-id/raw_content", json=request_data)

        assert response.status_code == 400
        assert "Raw content editing only available for slides content" in response.json()["detail"]

    def test_moderate_content_with_raw_content_and_approval(self, mock_moderator_user):
        """Test moderate content with both raw content update and approval"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock content
        mock_content = Mock()
        mock_content.id = "test-id"
        mock_content.content_type = "slides_pending"
        mock_content.raw_source = "https://example.com/existing.tex"
        mock_content.user_id = "user-123"
        mock_content.topic = "Old Topic"
        mock_content.content_url = "https://example.com/existing.pdf"
        mock_content.created_at = datetime.now(timezone.utc)
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = mock_content
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        request_data = {
            "raw_content": "\\documentclass{beamer}\\begin{document}\\frame{Updated}\\end{document}",
            "approve": True,
            "topic": "Updated Topic"
        }

        with patch('firebase_admin.storage.bucket') as mock_bucket, \
             patch('app.api.v1.routes.contentModerator.compile_latex_to_pdf') as mock_compile:
            
            # Mock Firebase bucket and blob
            mock_bucket_instance = Mock()
            mock_bucket.return_value = mock_bucket_instance
            mock_bucket_instance.name = "test-bucket"
            
            mock_blob = Mock()
            mock_bucket_instance.blob.return_value = mock_blob
            mock_blob.public_url = "https://example.com/raw.tex"
            
            # Mock successful LaTeX compilation
            mock_compile.return_value = b"mock pdf content"

            response = client.put("/api/v1/content-moderator/test-id/moderate", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["metadata"]["approved"] is True
        assert data["metadata"]["topic"] == "Updated Topic"
        assert mock_content.content_type == "slides"  # Should be approved
        assert mock_content.topic == "Updated Topic"

    def test_all_endpoints_with_non_moderator_access_denied(self, mock_non_moderator_user):
        """Test that key endpoints deny access to non-moderators"""
        app.dependency_overrides[get_current_user] = lambda: mock_non_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as non-moderator
        mock_user = Mock()
        mock_user.uid = mock_non_moderator_user["uid"]
        mock_user.is_moderator = False
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        # Test key endpoints that should deny access
        endpoints_to_test = [
            ("GET", "/api/v1/content-moderator/pending"),
            ("GET", "/api/v1/content-moderator/all"),
            ("POST", "/api/v1/content-moderator/profile"),
            ("GET", "/api/v1/content-moderator/profile"),
            ("GET", "/api/v1/content-moderator/stats"),
        ]

        for method, endpoint in endpoints_to_test:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json={})
            
            assert response.status_code == 403, f"Endpoint {method} {endpoint} should deny access to non-moderators"
            assert "Access denied" in response.json()["detail"]
