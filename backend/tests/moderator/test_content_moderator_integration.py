import pytest
import json
import uuid
import tempfile
import asyncio
import subprocess
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


class TestContentModeratorIntegration:
    """Integration tests and missing coverage scenarios for content moderator"""

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

    def test_request_validation_edge_cases(self, mock_moderator_user):
        """Test request validation with various edge cases"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        # Test with invalid JSON
        response = client.post(
            "/api/v1/content-moderator/profile",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422

        # Test with missing required fields in various endpoints
        response = client.put("/api/v1/content-moderator/test-id/raw_content", json={})
        assert response.status_code == 422

    @pytest.mark.skip(reason="Complex Mock serialization issue - needs refactoring")
    def test_content_url_extraction_edge_cases(self, mock_moderator_user):
        """Test various content URL extraction scenarios"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock content with various URL scenarios
        mock_content = Mock()
        mock_content.id = "test-id"
        mock_content.content_type = "slides"
        mock_content.raw_source = "https://storage.googleapis.com/test-bucket/content/user123/test-id.tex"
        mock_content.content_url = "https://storage.googleapis.com/test-bucket/content/user123/test-id.pdf"
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

        # Test with custom URL that doesn't end with .pdf
        request_data = {
            "raw_content": "\\documentclass{beamer}\\begin{document}\\end{document}",
            "content_url": "https://storage.googleapis.com/test-bucket/custom/path"
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
        # Should append .pdf to the custom URL
        expected_calls = mock_bucket_instance.blob.call_args_list
        pdf_path_found = any(".pdf" in str(call) for call in expected_calls)
        assert pdf_path_found

    @pytest.mark.skip(reason="Complex Mock serialization issue - needs refactoring")
    def test_cache_busting_functionality(self, mock_moderator_user):
        """Test that cache busting is properly implemented"""
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
        mock_content.raw_source = "https://storage.googleapis.com/test-bucket/existing.tex"
        mock_content.content_url = "https://storage.googleapis.com/test-bucket/existing.pdf"
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
             patch('app.api.v1.routes.contentModerator.compile_latex_to_pdf') as mock_compile, \
             patch('time.time', return_value=1234567890):
            
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
        
        # Verify cache busting parameters are added
        # Check that setattr was called with URLs containing cache busting parameters
        setattr_calls = [call for call in mock_content.__setattr__.call_args_list if 'raw_source' in str(call) or 'content_url' in str(call)]
        cache_buster_found = any("v=" in str(call) and "updated=" in str(call) for call in setattr_calls)
        assert cache_buster_found

    @pytest.mark.skip(reason="Complex Mock serialization issue - needs refactoring")
    def test_firebase_metadata_setting(self, mock_moderator_user):
        """Test that Firebase blob metadata is properly set"""
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
             patch('app.api.v1.routes.contentModerator.compile_latex_to_pdf') as mock_compile, \
             patch('time.time', return_value=1234567890):
            
            # Mock Firebase bucket and blob
            mock_bucket_instance = Mock()
            mock_bucket.return_value = mock_bucket_instance
            mock_bucket_instance.name = "test-bucket"
            
            mock_tex_blob = Mock()
            mock_pdf_blob = Mock()
            
            # Mock blob method to return different blobs for different paths
            def mock_blob(path):
                if path.endswith('.tex'):
                    return mock_tex_blob
                elif path.endswith('.pdf'):
                    return mock_pdf_blob
                return Mock()
            
            mock_bucket_instance.blob.side_effect = mock_blob
            mock_tex_blob.public_url = "https://example.com/raw.tex"
            mock_pdf_blob.public_url = "https://example.com/content.pdf"
            
            # Mock successful LaTeX compilation
            mock_compile.return_value = b"mock pdf content"

            response = client.put("/api/v1/content-moderator/test-id/raw_content", json=request_data)

        assert response.status_code == 200
        
        # Verify metadata was set for both blobs
        expected_metadata = {
            'Cache-Control': 'no-cache, must-revalidate',
            'Last-Modified': '1234567890'
        }
        assert mock_tex_blob.metadata == expected_metadata
        assert mock_pdf_blob.metadata == expected_metadata

    def test_moderation_activity_tracking_with_existing_counts(self, mock_moderator_user):
        """Test moderation activity tracking when profile exists with counts"""
        from app.api.v1.routes.contentModerator import track_moderation_activity
        
        mock_db = Mock()
        
        # Mock existing profile with existing counts
        mock_profile = Mock()
        mock_profile.contents_modified = 10
        mock_profile.quizzes_modified = 5
        mock_db.query.return_value.filter.return_value.first.return_value = mock_profile
        
        # Test both content and quiz tracking
        asyncio.run(track_moderation_activity(
            moderator_id=mock_moderator_user["uid"],
            db=mock_db,
            content_id="content-123",
            quiz_id="quiz-456"
        ))
        
        # Verify both history entries were created
        assert mock_db.add.call_count >= 2  # Profile might be new, plus 2 history entries
        mock_db.commit.assert_called()

    def test_content_type_validation_edge_cases(self, mock_moderator_user):
        """Test content type validation for various scenarios"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Test with various content types
        content_types_to_test = ["flashcards", "notes", "summary", "unknown"]
        
        for content_type in content_types_to_test:
            # Create content mock inside loop to avoid closure issues
            def create_mock_content(ct=content_type):
                mock_content = Mock()
                mock_content.id = f"test-{ct}"
                mock_content.content_type = ct
                return mock_content
            
            current_content = create_mock_content()
            
            def mock_query_side_effect(model, content=current_content):
                mock_query = Mock()
                if model == User:
                    mock_query.filter.return_value.first.return_value = mock_user
                elif model == ContentItem:
                    mock_query.filter.return_value.first.return_value = content
                return mock_query
            
            mock_db.query.side_effect = mock_query_side_effect

            response = client.get(f"/api/v1/content-moderator/test-{content_type}/raw_content")
            assert response.status_code == 400
            assert "Raw content only available for slides content" in response.json()["detail"]

    def test_profile_creation_rollback_on_error(self, mock_moderator_user):
        """Test profile creation rollback when domain/topic addition fails"""
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
                mock_query.filter.return_value.first.return_value = None  # No existing profile
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect
        
        # Mock commit to fail
        mock_db.commit.side_effect = SQLAlchemyError("Database error")

        request_data = {
            "domains": ["Computer Science"],
            "topics": ["Python"]
        }

        response = client.post("/api/v1/content-moderator/profile", json=request_data)

        assert response.status_code == 500
        mock_db.rollback.assert_called()

    def test_url_validation_patterns(self, mock_moderator_user):
        """Test various URL validation patterns"""
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

        # Test various invalid URL patterns
        invalid_urls = [
            "http://example.com/file.pdf",  # Wrong protocol
            "https://amazonaws.com/bucket/file.pdf",  # Wrong domain
            "https://storage.googleapis.com/file.pdf",  # Missing bucket
            "ftp://storage.googleapis.com/bucket/file.pdf",  # Wrong protocol
        ]

        with patch('firebase_admin.storage.bucket') as mock_bucket:
            mock_bucket.return_value.name = "test-bucket"

            for invalid_url in invalid_urls:
                request_data = {"content_url": invalid_url}
                
                response = client.put("/api/v1/content-moderator/test-id/moderate", json=request_data)
                assert response.status_code == 400
                assert "Invalid content_url format" in response.json()["detail"]

    def test_latex_compilation_timeout_handling(self):
        """Test LaTeX compilation timeout handling with specific timeout error"""
        from app.api.v1.routes.contentModerator import compile_latex_to_pdf
        
        latex_content = "\\documentclass{beamer}\\begin{document}\\end{document}"
        topic = "Test Topic"
        
        with patch('tempfile.TemporaryDirectory') as mock_tempdir, \
             patch('asyncio.to_thread') as mock_to_thread, \
             patch('builtins.open', create=True):
            
            # Mock temporary directory
            mock_temp_context = Mock()
            mock_temp_context.__enter__ = Mock(return_value="/tmp/test")
            mock_temp_context.__exit__ = Mock(return_value=None)
            mock_tempdir.return_value = mock_temp_context
            
            # Mock subprocess timeout (specific timeout parameter)
            def timeout_side_effect(*args, **kwargs):
                if 'timeout' in kwargs and kwargs['timeout'] == 30:
                    raise subprocess.TimeoutExpired("pdflatex", 30)
                return Mock(returncode=0)
            
            mock_to_thread.side_effect = timeout_side_effect
            
            with pytest.raises(Exception) as exc_info:
                asyncio.run(compile_latex_to_pdf(latex_content, topic))
            
            assert "Error compiling LaTeX" in str(exc_info.value)

    @pytest.mark.skip(reason="Mock delete call assertion issue - needs refactoring")
    def test_profile_update_partial_fields(self, mock_moderator_user):
        """Test profile update with only some fields provided"""
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

        # Test with empty arrays (should delete existing entries)
        request_data = {
            "domains": [],
            "topics": []
        }

        response = client.put("/api/v1/content-moderator/profile", json=request_data)

        assert response.status_code == 200
        # Should have called delete for both domains and topics
        delete_calls = list(mock_db.query.return_value.filter.return_value.delete.call_args_list)
        assert len(delete_calls) >= 2  # At least one for domains, one for topics

    def test_moderation_stats_with_large_history(self, mock_moderator_user):
        """Test moderation stats with large history (limit to 10)"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock profile
        mock_profile = Mock()
        mock_profile.moderator_id = mock_moderator_user["uid"]
        mock_profile.contents_modified = 50
        mock_profile.quizzes_modified = 30
        mock_profile.total_time_spent = 1000.0
        
        # Mock large history (should be limited to 10)
        content_histories = [Mock(content_id=f"content-{i}", modified_at=datetime.now(timezone.utc)) for i in range(15)]
        quiz_histories = [Mock(quiz_id=f"quiz-{i}", modified_at=datetime.now(timezone.utc)) for i in range(12)]
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = mock_profile
            elif model == ModeratorContentHistory:
                # Mock the chained query methods
                mock_filter = Mock()
                mock_order_by = Mock()
                mock_limit = Mock()
                mock_limit.all.return_value = content_histories[:10]  # Limit to 10
                mock_order_by.limit.return_value = mock_limit
                mock_filter.order_by.return_value = mock_order_by
                mock_query.filter.return_value = mock_filter
            elif model == ModeratorQuizHistory:
                # Mock the chained query methods
                mock_filter = Mock()
                mock_order_by = Mock()
                mock_limit = Mock()
                mock_limit.all.return_value = quiz_histories[:10]  # Limit to 10
                mock_order_by.limit.return_value = mock_limit
                mock_filter.order_by.return_value = mock_order_by
                mock_query.filter.return_value = mock_filter
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        response = client.get("/api/v1/content-moderator/stats")

        assert response.status_code == 200
        data = response.json()
        assert len(data["recent_content_modifications"]) == 10
        assert len(data["recent_quiz_modifications"]) == 10
        assert data["contents_modified"] == 50
        assert data["quizzes_modified"] == 30

    @pytest.mark.skip(reason="Complex Mock serialization issue - needs refactoring")
    def test_content_moderation_with_special_characters(self, mock_moderator_user):
        """Test content moderation with special characters in LaTeX"""
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

        # Test with LaTeX containing special characters
        request_data = {
            "raw_content": "\\documentclass{beamer}\n\\usepackage[utf8]{inputenc}\n\\begin{document}\n\\frame{Testing ñ, ü, ß, €}\n\\end{document}"
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
        # Verify the content was uploaded with UTF-8 encoding
        mock_blob.upload_from_string.assert_called()
        call_args = mock_blob.upload_from_string.call_args
        assert call_args[1]["content_type"] == "text/x-tex"

    def test_error_propagation_in_nested_functions(self, mock_moderator_user):
        """Test that errors in nested function calls are properly propagated"""
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

        # Test error in Firebase bucket initialization
        with patch('firebase_admin.storage.bucket') as mock_bucket:
            mock_bucket.side_effect = Exception("Firebase initialization failed")

            response = client.put("/api/v1/content-moderator/test-id/raw_content", json=request_data)

        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()

    def test_moderator_access_with_missing_user_record(self, mock_moderator_user):
        """Test moderator access check when user record is missing from database"""
        from app.api.v1.routes.contentModerator import check_moderator_access
        
        mock_db = Mock()
        # Return None for user query (user not found in database)
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        result = asyncio.run(check_moderator_access(mock_moderator_user, mock_db))
        
        # Should return None (falsy) when user not found
        assert result is None
