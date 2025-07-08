import pytest
import json
import uuid
import tempfile
import asyncio
from unittest.mock import Mock, patch, AsyncMock, MagicMock, mock_open
from fastapi.testclient import TestClient
from datetime import datetime, timezone
from sqlalchemy.exc import SQLAlchemyError
import subprocess

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


class TestContentModeratorHelperFunctions:
    """Test helper functions and edge cases for better coverage"""

    @pytest.fixture
    def mock_moderator_user(self):
        """Mock moderator user data using env test credentials"""
        return {"uid": "wifade8269@finfave.com", "email": "wifade8269@finfave.com"}

    @pytest.fixture
    def mock_non_moderator_user(self):
        """Mock non-moderator user data using env test credentials"""
        return {"uid": "sewif98534@fenexy.com", "email": "sewif98534@fenexy.com"}

    def setup_method(self):
        """Setup method to clear dependency overrides before each test"""
        app.dependency_overrides.clear()

    def teardown_method(self):
        """Teardown method to clear dependency overrides after each test"""
        app.dependency_overrides.clear()

    def test_compile_latex_to_pdf_subprocess_error_with_stderr(self):
        """Test LaTeX compilation with subprocess error and stderr output"""
        from app.api.v1.routes.contentModerator import compile_latex_to_pdf
        
        latex_content = "\\invalid{latex}content"
        topic = "Test Topic"
        
        with patch('tempfile.TemporaryDirectory') as mock_tempdir, \
             patch('asyncio.to_thread') as mock_to_thread, \
             patch('os.path.exists', return_value=False), \
             patch('builtins.open', mock_open()):
            
            # Mock temporary directory
            mock_temp_context = Mock()
            mock_temp_context.__enter__ = Mock(return_value="/tmp/test")
            mock_temp_context.__exit__ = Mock(return_value=None)
            mock_tempdir.return_value = mock_temp_context
            
            # Mock failed subprocess with stderr
            mock_process = Mock()
            mock_process.returncode = 1
            mock_process.stderr = Mock()
            mock_process.stderr.decode.return_value = "LaTeX compilation failed: Undefined control sequence"
            mock_to_thread.return_value = mock_process
            
            with pytest.raises(Exception) as exc_info:
                asyncio.run(compile_latex_to_pdf(latex_content, topic))
            
            assert "LaTeX compilation failed: Undefined control sequence" in str(exc_info.value)

    def test_compile_latex_to_pdf_subprocess_error_no_stderr(self):
        """Test LaTeX compilation with subprocess error and no stderr"""
        from app.api.v1.routes.contentModerator import compile_latex_to_pdf
        
        latex_content = "\\invalid{latex}content"
        topic = "Test Topic"
        
        with patch('tempfile.TemporaryDirectory') as mock_tempdir, \
             patch('asyncio.to_thread') as mock_to_thread, \
             patch('os.path.exists', return_value=False), \
             patch('builtins.open', mock_open()):
            
            # Mock temporary directory
            mock_temp_context = Mock()
            mock_temp_context.__enter__ = Mock(return_value="/tmp/test")
            mock_temp_context.__exit__ = Mock(return_value=None)
            mock_tempdir.return_value = mock_temp_context
            
            # Mock failed subprocess with no stderr
            mock_process = Mock()
            mock_process.returncode = 1
            mock_process.stderr = None
            mock_to_thread.return_value = mock_process
            
            with pytest.raises(Exception) as exc_info:
                asyncio.run(compile_latex_to_pdf(latex_content, topic))
            
            assert "Unknown compilation error" in str(exc_info.value)

    def test_compile_latex_to_pdf_general_exception(self):
        """Test LaTeX compilation with general exception"""
        from app.api.v1.routes.contentModerator import compile_latex_to_pdf
        
        latex_content = "\\documentclass{beamer}\\begin{document}\\end{document}"
        topic = "Test Topic"
        
        with patch('tempfile.TemporaryDirectory') as mock_tempdir:
            # Mock tempdir raising an exception
            mock_tempdir.side_effect = Exception("Temp directory creation failed")
            
            with pytest.raises(Exception) as exc_info:
                asyncio.run(compile_latex_to_pdf(latex_content, topic))
            
            assert "Error compiling LaTeX: Temp directory creation failed" in str(exc_info.value)

    def test_track_moderation_activity_with_existing_profile_and_counts(self, mock_moderator_user):
        """Test tracking moderation activity with existing profile and existing counts"""
        from app.api.v1.routes.contentModerator import track_moderation_activity
        
        mock_db = Mock()
        
        # Mock existing profile with existing counts
        mock_profile = Mock()
        mock_profile.contents_modified = 5
        mock_profile.quizzes_modified = 3
        mock_db.query.return_value.filter.return_value.first.return_value = mock_profile
        
        # Test the function directly without dangerous patching
        asyncio.run(track_moderation_activity(
            moderator_id=mock_moderator_user["uid"],
            db=mock_db,
            content_id="content-123",
            quiz_id="quiz-456"
        ))
        
        # Should have added content and quiz history and committed
        assert mock_db.add.call_count >= 2  # At least content and quiz history
        mock_db.commit.assert_called()

    def test_track_moderation_activity_with_none_counts(self, mock_moderator_user):
        """Test tracking moderation activity when counts are None"""
        from app.api.v1.routes.contentModerator import track_moderation_activity
        
        mock_db = Mock()
        
        # Mock existing profile with None counts
        mock_profile = Mock()
        mock_profile.contents_modified = None
        mock_profile.quizzes_modified = None
        mock_db.query.return_value.filter.return_value.first.return_value = mock_profile
        
        # Test the function directly without dangerous patching
        asyncio.run(track_moderation_activity(
            moderator_id=mock_moderator_user["uid"],
            db=mock_db,
            content_id="content-123",
            quiz_id="quiz-456"
        ))
        
        # Should have added content and quiz history and committed
        assert mock_db.add.call_count >= 2  # At least content and quiz history
        mock_db.commit.assert_called()

    def test_check_moderator_access_user_not_found(self, mock_moderator_user):
        """Test check_moderator_access when user is not found in database"""
        from app.api.v1.routes.contentModerator import check_moderator_access
        
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        result = asyncio.run(check_moderator_access(mock_moderator_user, mock_db))
        
        assert result is None

    def test_check_moderator_access_user_found_but_not_moderator(self, mock_non_moderator_user):
        """Test check_moderator_access when user exists but is not moderator"""
        from app.api.v1.routes.contentModerator import check_moderator_access
        
        mock_db = Mock()
        mock_user = Mock()
        mock_user.is_moderator = False
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        result = asyncio.run(check_moderator_access(mock_non_moderator_user, mock_db))
        
        assert result is False

    @pytest.mark.skip(reason="Complex Mock serialization issue - needs refactoring")
    def test_edit_raw_content_with_no_existing_raw_source_or_content_url(self, mock_moderator_user):
        """Test editing raw content when there's no existing raw_source or content_url"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock content with no existing URLs
        mock_content = Mock()
        mock_content.id = "test-id"
        mock_content.content_type = "slides_pending"
        mock_content.raw_source = None
        mock_content.content_url = None
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

            response = client.put("/api/v1/content-moderator/test-id/raw_content", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["compilation_successful"] is True

    def test_moderate_content_approval_without_raw_content(self, mock_moderator_user):
        """Test moderating content with approval only (no raw content update)"""
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
        mock_content.topic = "Original Topic"
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
            "approve": True
        }

        response = client.put("/api/v1/content-moderator/test-id/moderate", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["metadata"]["approved"] is True
        assert mock_content.content_type == "slides"  # Should be approved
        mock_db.commit.assert_called()

    def test_moderate_content_with_content_url_only(self, mock_moderator_user):
        """Test moderating content with only content_url update"""
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
        mock_content.topic = "Original Topic"
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
            "content_url": "https://storage.googleapis.com/test-bucket/new-content.pdf"
        }

        with patch('firebase_admin.storage.bucket') as mock_bucket:
            mock_bucket_instance = Mock()
            mock_bucket.return_value = mock_bucket_instance
            mock_bucket_instance.name = "test-bucket"

            response = client.put("/api/v1/content-moderator/test-id/moderate", json=request_data)

        assert response.status_code == 200
        # Content URL should be updated
        assert mock_content.content_url == "https://storage.googleapis.com/test-bucket/new-content.pdf"
        mock_db.commit.assert_called()

    def test_update_moderator_profile_domains_only(self, mock_moderator_user):
        """Test updating moderator profile with only domains"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock existing profile
        mock_profile = Mock()
        mock_profile.moderator_id = mock_moderator_user["uid"]
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = mock_profile
            elif model in [ModeratorDomain, ModeratorTopic]:
                mock_query.filter.return_value.delete.return_value = None
                return mock_query
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        request_data = {
            "domains": ["New Domain 1", "New Domain 2"]
            # No topics provided (should be None)
        }

        response = client.put("/api/v1/content-moderator/profile", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Moderator profile updated successfully"
        # Should add domains but not touch topics
        mock_db.add.assert_called()
        mock_db.commit.assert_called()

    def test_update_moderator_profile_topics_only(self, mock_moderator_user):
        """Test updating moderator profile with only topics"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock existing profile
        mock_profile = Mock()
        mock_profile.moderator_id = mock_moderator_user["uid"]
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = mock_profile
            elif model in [ModeratorDomain, ModeratorTopic]:
                mock_query.filter.return_value.delete.return_value = None
                return mock_query
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        request_data = {
            "topics": ["New Topic 1", "New Topic 2"]
            # No domains provided (should be None)
        }

        response = client.put("/api/v1/content-moderator/profile", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Moderator profile updated successfully"
        # Should add topics but not touch domains
        mock_db.add.assert_called()
        mock_db.commit.assert_called()

    def test_moderate_quiz_with_partial_updates(self, mock_moderator_user):
        """Test moderating quiz with only some fields updated"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock quiz
        mock_quiz = Mock()
        mock_quiz.quiz_id = "quiz-123"
        mock_quiz.topic = "Original Topic"
        mock_quiz.domain = "Original Domain"
        mock_quiz.created_at = datetime.now(timezone.utc)
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == Quiz:
                mock_query.filter.return_value.first.return_value = mock_quiz
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        request_data = {
            "topic": "Updated Topic"
            # Only topic updated, domain and approve not provided
        }

        response = client.put("/api/v1/content-moderator/quiz/quiz-123/moderate", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["metadata"]["topic"] == "Updated Topic"
        assert mock_quiz.topic == "Updated Topic"
        # Domain should remain unchanged
        assert mock_quiz.domain == "Original Domain"
        mock_db.commit.assert_called()

    def test_get_all_moderator_profiles_with_user_info_not_found(self, mock_moderator_user):
        """Test getting all moderator profiles when user info is not found"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock current user as moderator
        mock_current_user = Mock()
        mock_current_user.uid = mock_moderator_user["uid"]
        mock_current_user.is_moderator = True
        
        # Mock profile
        mock_profile = Mock()
        mock_profile.moderator_id = "orphaned-mod"
        mock_profile.contents_modified = 5
        mock_profile.quizzes_modified = 3
        mock_profile.total_time_spent = 120.0
        mock_profile.created_at = datetime.now(timezone.utc)
        
        query_call_count = 0
        def mock_query_side_effect(model):
            nonlocal query_call_count
            query_call_count += 1
            
            mock_query = Mock()
            if model == User:
                if query_call_count == 1:
                    # First call for access check
                    mock_query.filter.return_value.first.return_value = mock_current_user
                else:
                    # Subsequent calls for user info lookup
                    mock_query.filter.return_value.first.return_value = None  # User not found
            elif model == ModeratorProfile:
                mock_query.all.return_value = [mock_profile]
            elif model in [ModeratorDomain, ModeratorTopic]:
                mock_query.filter.return_value.all.return_value = []
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        response = client.get("/api/v1/content-moderator/profiles/all")

        assert response.status_code == 200
        data = response.json()
        assert "moderator_profiles" in data
        assert data["total_count"] == 1
        profile = data["moderator_profiles"][0]
        assert profile["moderator_id"] == "orphaned-mod"
        assert profile["user_email"] is None  # User info not found

    @pytest.mark.skip(reason="Complex Mock serialization issue - needs refactoring")
    def test_edit_raw_content_pending_to_slides_transition(self, mock_moderator_user):
        """Test editing raw content for pending slides that successfully compiles and transitions to slides"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock pending content
        mock_content = Mock()
        mock_content.id = "test-id"
        mock_content.content_type = "slides_pending"
        mock_content.raw_source = "https://example.com/existing.tex"
        mock_content.content_url = "https://example.com/existing.pdf"
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
            "raw_content": "\\documentclass{beamer}\\begin{document}\\frame{Valid LaTeX}\\end{document}"
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

            response = client.put("/api/v1/content-moderator/test-id/raw_content", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["compilation_successful"] is True
        # Should transition from slides_pending to slides due to successful compilation
        assert mock_content.content_type == "slides"

    def test_moderate_content_compilation_failure_no_approval(self, mock_moderator_user):
        """Test moderating content with raw content that fails compilation and no explicit approval"""
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
        mock_content.topic = "Test Topic"
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
            "raw_content": "\\invalid{latex}content",
            "approve": False  # Explicit false
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
            
            # Mock failed LaTeX compilation
            mock_compile.side_effect = Exception("LaTeX compilation failed")

            response = client.put("/api/v1/content-moderator/test-id/moderate", json=request_data)

        assert response.status_code == 200
        data = response.json()
        # Should remain as slides_pending due to compilation failure and no explicit approval
        assert mock_content.content_type == "slides_pending"
        assert data["metadata"]["approved"] is False

    def test_get_moderator_profile_with_zero_time_spent(self, mock_moderator_user):
        """Test getting moderator profile with zero total_time_spent"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock profile with zero time spent
        mock_profile = Mock()
        mock_profile.moderator_id = mock_moderator_user["uid"]
        mock_profile.contents_modified = 5
        mock_profile.quizzes_modified = 3
        mock_profile.total_time_spent = None  # Should default to 0
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = mock_profile
            elif model in [ModeratorDomain, ModeratorTopic]:
                mock_query.filter.return_value.all.return_value = []
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        response = client.get("/api/v1/content-moderator/profile")

        assert response.status_code == 200
        data = response.json()
        assert data["total_time_spent"] == pytest.approx(0.0)  # Should convert None to 0.0

    def test_all_endpoints_database_errors(self, mock_moderator_user):
        """Test database error handling across all endpoints"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock database error for all queries
        mock_db.query.side_effect = SQLAlchemyError("Database connection failed")

        endpoints_to_test = [
            ("GET", "/api/v1/content-moderator/pending"),
            ("GET", "/api/v1/content-moderator/all"),
            ("GET", "/api/v1/content-moderator/profile"),
            ("GET", "/api/v1/content-moderator/stats"),
            ("GET", "/api/v1/content-moderator/quiz/pending"),
            ("GET", "/api/v1/content-moderator/quiz/all"),
            ("GET", "/api/v1/content-moderator/profiles/all"),
        ]

        for method, endpoint in endpoints_to_test:
            response = client.get(endpoint)
            assert response.status_code == 500
            assert "internal server error" in response.json()["detail"].lower()

    def test_quiz_moderation_with_difficulty_attribute(self, mock_moderator_user):
        """Test quiz moderation with difficulty attribute handling"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        # Mock quiz with difficulty enum
        mock_quiz = Mock()
        mock_quiz.quiz_id = "quiz-123"
        mock_quiz.topic = "Mathematics"
        mock_quiz.domain = "Science"
        mock_quiz.user_id = "user-123"
        mock_quiz.created_at = datetime.now(timezone.utc)
        mock_quiz.duration = 30
        
        # Mock difficulty enum
        mock_difficulty = Mock()
        mock_difficulty.value = "medium"
        mock_quiz.difficulty = mock_difficulty
        
        mock_db.query.return_value.all.return_value = [mock_quiz]

        response = client.get("/api/v1/content-moderator/quiz/all")

        assert response.status_code == 200
        data = response.json()
        assert "all_quizzes" in data
        assert len(data["all_quizzes"]) == 1
        quiz = data["all_quizzes"][0]
        assert quiz["difficulty"] == "medium"

    def test_quiz_moderation_without_difficulty_attribute(self, mock_moderator_user):
        """Test quiz moderation when difficulty attribute is None"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        # Mock quiz without difficulty
        mock_quiz = Mock()
        mock_quiz.quiz_id = "quiz-123"
        mock_quiz.topic = "Mathematics"
        mock_quiz.domain = "Science"
        mock_quiz.user_id = "user-123"
        mock_quiz.created_at = datetime.now(timezone.utc)
        mock_quiz.duration = 30
        mock_quiz.difficulty = None
        
        mock_db.query.return_value.all.return_value = [mock_quiz]

        response = client.get("/api/v1/content-moderator/quiz/all")

        assert response.status_code == 200
        data = response.json()
        quiz = data["all_quizzes"][0]
        assert quiz["difficulty"] is None
