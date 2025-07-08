import pytest
import json
import uuid
import tempfile
import asyncio
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from datetime import datetime, timezone

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


class TestContentModeratorRoutes:
    """Test content moderator routes endpoints"""

    @pytest.fixture
    def mock_moderator_user(self):
        """Mock moderator user data"""
        return {"uid": "mod-user-123", "email": "moderator@example.com"}

    @pytest.fixture
    def mock_non_moderator_user(self):
        """Mock non-moderator user data"""
        return {"uid": "user-123", "email": "user@example.com"}

    @pytest.fixture
    def sample_moderator_profile(self):
        """Sample moderator profile"""
        return ModeratorProfile(
            moderator_id="mod-user-123",
            contents_modified=5,
            quizzes_modified=3,
            total_time_spent=120.5
        )

    @pytest.fixture
    def sample_pending_content(self):
        """Sample pending content item"""
        return ContentItem(
            id=str(uuid.uuid4()),
            user_id="user-123",
            content_url="https://example.com/content.pdf",
            raw_source="https://example.com/raw.tex",
            topic="Python Programming",
            content_type="slides_pending",
            created_at=datetime.now(timezone.utc)
        )

    @pytest.fixture
    def sample_approved_content(self):
        """Sample approved content item"""
        return ContentItem(
            id=str(uuid.uuid4()),
            user_id="user-123",
            content_url="https://example.com/content.pdf",
            raw_source="https://example.com/raw.tex",
            topic="JavaScript Programming",
            content_type="slides",
            created_at=datetime.now(timezone.utc)
        )

    @pytest.fixture
    def sample_quiz(self):
        """Sample quiz"""
        return Quiz(
            quiz_id=str(uuid.uuid4()),
            user_id="user-123",
            topic="Mathematics",
            domain="Science",
            created_at=datetime.now(timezone.utc),
            duration=30
        )

    def setup_method(self):
        """Setup method to clear dependency overrides before each test"""
        app.dependency_overrides.clear()

    def teardown_method(self):
        """Teardown method to clear dependency overrides after each test"""
        app.dependency_overrides.clear()

    def test_get_pending_content_success(self, mock_moderator_user, sample_pending_content):
        """Test successful retrieval of pending content by moderator"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        # Mock pending content query
        mock_db.query.return_value.filter.return_value.all.return_value = [sample_pending_content]

        # Act
        response = client.get("/api/v1/content-moderator/pending")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "pending_contents" in data
        assert len(data["pending_contents"]) == 1
        content = data["pending_contents"][0]
        assert content["topic"] == "Python Programming"
        assert content["user_id"] == "user-123"

    def test_get_pending_content_access_denied(self, mock_non_moderator_user):
        """Test access denied for non-moderator user"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_non_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as non-moderator
        mock_user = Mock()
        mock_user.uid = mock_non_moderator_user["uid"]
        mock_user.is_moderator = False
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        # Act
        response = client.get("/api/v1/content-moderator/pending")

        # Assert
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]

    def test_get_content_raw_content_success(self, mock_moderator_user, sample_pending_content):
        """Test successful retrieval of raw content"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        # Mock content query to return our sample content
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = sample_pending_content
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        content_id = str(sample_pending_content.id)

        with patch('requests.get') as mock_requests:
            # Mock successful HTTP request to fetch raw content
            mock_response = Mock()
            mock_response.text = "\\documentclass{beamer}\\begin{document}\\end{document}"
            mock_response.raise_for_status = Mock()
            mock_requests.return_value = mock_response

            # Act
            response = client.get(f"/api/v1/content-moderator/{content_id}/raw_content")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["contentId"] == sample_pending_content.id
        assert "raw_content" in data
        assert data["metadata"]["type"] == "slides_pending"

    def test_get_content_raw_content_not_found(self, mock_moderator_user):
        """Test raw content retrieval for non-existent content"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock content query to return None
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = None
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        content_id = "nonexistent-id"

        # Act
        response = client.get(f"/api/v1/content-moderator/{content_id}/raw_content")

        # Assert
        assert response.status_code == 404
        assert "Content not found" in response.json()["detail"]

    def test_get_content_raw_content_wrong_type(self, mock_moderator_user):
        """Test raw content retrieval for non-slides content"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock content with wrong type
        mock_content = Mock()
        mock_content.id = "test-id"
        mock_content.content_type = "flashcards"
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = mock_content
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        content_id = "test-id"

        # Act
        response = client.get(f"/api/v1/content-moderator/{content_id}/raw_content")

        # Assert
        assert response.status_code == 400
        assert "Raw content only available for slides content" in response.json()["detail"]

    def test_edit_content_raw_content_success(self, mock_moderator_user, sample_pending_content):
        """Test successful editing of raw content"""
        # Setup dependency overrides
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
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = sample_pending_content
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None  # No existing profile
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        content_id = str(sample_pending_content.id)
        request_data = {
            "raw_content": "\\documentclass{beamer}\\begin{document}\\frame{Test}\\end{document}"
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

            # Act
            response = client.put(f"/api/v1/content-moderator/{content_id}/raw_content", json=request_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["contentId"] == sample_pending_content.id
        assert data["compilation_successful"] is True
        assert "Raw content updated and compiled successfully" in data["message"]
        mock_blob.upload_from_string.assert_called()
        mock_blob.make_public.assert_called()
        mock_db.commit.assert_called()

    def test_edit_content_raw_content_compilation_failure(self, mock_moderator_user, sample_pending_content):
        """Test editing raw content with compilation failure"""
        # Setup dependency overrides
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
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = sample_pending_content
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        content_id = str(sample_pending_content.id)
        request_data = {
            "raw_content": "\\invalid{latex}content"
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

            # Act
            response = client.put(f"/api/v1/content-moderator/{content_id}/raw_content", json=request_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["compilation_successful"] is False
        assert "Raw content updated but compilation failed" in data["message"]
        mock_blob.upload_from_string.assert_called()  # Raw content still uploaded
        mock_db.commit.assert_called()

    def test_moderate_content_success(self, mock_moderator_user, sample_pending_content):
        """Test successful content moderation with approval"""
        # Setup dependency overrides
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
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = sample_pending_content
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        content_id = str(sample_pending_content.id)
        request_data = {
            "approve": True,
            "topic": "Advanced Python Programming"
        }

        # Act
        response = client.put(f"/api/v1/content-moderator/{content_id}/moderate", json=request_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["contentId"] == sample_pending_content.id
        assert data["message"] == "Content moderated successfully"
        assert data["metadata"]["approved"] is True
        assert data["metadata"]["topic"] == "Advanced Python Programming"
        assert sample_pending_content.content_type == "slides"  # Changed from slides_pending
        assert sample_pending_content.topic == "Advanced Python Programming"
        mock_db.commit.assert_called()

    def test_get_all_content_for_moderation_success(self, mock_moderator_user, sample_pending_content, sample_approved_content):
        """Test successful retrieval of all content for moderation"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        # Mock all content query
        mock_db.query.return_value.all.return_value = [sample_pending_content, sample_approved_content]

        # Act
        response = client.get("/api/v1/content-moderator/all")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "all_contents" in data
        assert len(data["all_contents"]) == 2

    def test_create_moderator_profile_success(self, mock_moderator_user):
        """Test successful creation of moderator profile"""
        # Setup dependency overrides
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

        request_data = {
            "domains": ["Computer Science", "Mathematics"],
            "topics": ["Python", "Machine Learning"]
        }

        # Act
        response = client.post("/api/v1/content-moderator/profile", json=request_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Moderator profile created successfully"
        assert data["moderator_id"] == mock_moderator_user["uid"]
        assert data["domains"] == ["Computer Science", "Mathematics"]
        assert data["topics"] == ["Python", "Machine Learning"]
        mock_db.add.assert_called()
        mock_db.commit.assert_called()

    def test_create_moderator_profile_already_exists(self, mock_moderator_user, sample_moderator_profile):
        """Test creation of moderator profile when one already exists"""
        # Setup dependency overrides
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
                mock_query.filter.return_value.first.return_value = sample_moderator_profile
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        request_data = {
            "domains": ["Computer Science"],
            "topics": ["Python"]
        }

        # Act
        response = client.post("/api/v1/content-moderator/profile", json=request_data)

        # Assert
        assert response.status_code == 400
        assert "Moderator profile already exists" in response.json()["detail"]

    def test_get_moderator_profile_success(self, mock_moderator_user, sample_moderator_profile):
        """Test successful retrieval of moderator profile"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock domain and topic objects
        mock_domain = Mock()
        mock_domain.domain = "Computer Science"
        mock_topic = Mock()
        mock_topic.topic = "Python"
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = sample_moderator_profile
            elif model == ModeratorDomain:
                mock_query.filter.return_value.all.return_value = [mock_domain]
            elif model == ModeratorTopic:
                mock_query.filter.return_value.all.return_value = [mock_topic]
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        # Act
        response = client.get("/api/v1/content-moderator/profile")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["moderator_id"] == sample_moderator_profile.moderator_id
        assert data["contents_modified"] == 5
        assert data["quizzes_modified"] == 3
        assert data["total_time_spent"] == pytest.approx(120.5)
        assert data["domains"] == ["Computer Science"]
        assert data["topics"] == ["Python"]

    def test_update_moderator_profile_success(self, mock_moderator_user, sample_moderator_profile):
        """Test successful update of moderator profile"""
        # Setup dependency overrides
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
                mock_query.filter.return_value.first.return_value = sample_moderator_profile
            elif model in [ModeratorDomain, ModeratorTopic]:
                mock_query.filter.return_value.delete.return_value = None
                return mock_query
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        request_data = {
            "domains": ["Data Science", "AI"],
            "topics": ["Deep Learning", "NLP"]
        }

        # Act
        response = client.put("/api/v1/content-moderator/profile", json=request_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Moderator profile updated successfully"
        assert data["moderator_id"] == mock_moderator_user["uid"]
        mock_db.add.assert_called()
        mock_db.commit.assert_called()

    def test_get_moderator_stats_success(self, mock_moderator_user, sample_moderator_profile):
        """Test successful retrieval of moderator stats"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock history objects
        mock_content_history = Mock()
        mock_content_history.content_id = "content-1"
        mock_content_history.modified_at = datetime.now(timezone.utc)
        
        mock_quiz_history = Mock()
        mock_quiz_history.quiz_id = "quiz-1"
        mock_quiz_history.modified_at = datetime.now(timezone.utc)
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = sample_moderator_profile
            elif model == ModeratorContentHistory:
                mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [mock_content_history]
            elif model == ModeratorQuizHistory:
                mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [mock_quiz_history]
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        # Act
        response = client.get("/api/v1/content-moderator/stats")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["moderator_id"] == sample_moderator_profile.moderator_id
        assert data["contents_modified"] == 5
        assert data["quizzes_modified"] == 3
        assert len(data["recent_content_modifications"]) == 1
        assert len(data["recent_quiz_modifications"]) == 1

    def test_get_pending_quizzes_success(self, mock_moderator_user, sample_quiz):
        """Test successful retrieval of pending quizzes"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        # Mock quiz query
        mock_db.query.return_value.all.return_value = [sample_quiz]

        # Act
        response = client.get("/api/v1/content-moderator/quiz/pending")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "pending_quizzes" in data
        assert len(data["pending_quizzes"]) == 1
        quiz = data["pending_quizzes"][0]
        assert quiz["topic"] == "Mathematics"
        assert quiz["domain"] == "Science"

    def test_moderate_quiz_success(self, mock_moderator_user, sample_quiz):
        """Test successful quiz moderation"""
        # Setup dependency overrides
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
                mock_query.filter.return_value.first.return_value = sample_quiz
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        quiz_id = str(sample_quiz.quiz_id)
        request_data = {
            "topic": "Advanced Mathematics",
            "domain": "STEM",
            "approve": True
        }

        # Act
        response = client.put(f"/api/v1/content-moderator/quiz/{quiz_id}/moderate", json=request_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["quizId"] == str(sample_quiz.quiz_id)
        assert data["message"] == "Quiz moderated successfully"
        assert data["metadata"]["approved"] is True
        assert data["metadata"]["topic"] == "Advanced Mathematics"
        assert data["metadata"]["domain"] == "STEM"
        assert sample_quiz.topic == "Advanced Mathematics"
        assert sample_quiz.domain == "STEM"
        mock_db.commit.assert_called()

    def test_delete_moderator_profile_success(self, mock_moderator_user, sample_moderator_profile):
        """Test successful deletion of moderator profile"""
        # Setup dependency overrides
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
                mock_query.filter.return_value.first.return_value = sample_moderator_profile
            elif model in [ModeratorDomain, ModeratorTopic]:
                mock_query.filter.return_value.delete.return_value = None
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        # Act
        response = client.delete("/api/v1/content-moderator/profile")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Moderator profile deleted successfully"
        assert data["moderator_id"] == mock_moderator_user["uid"]
        mock_db.delete.assert_called_with(sample_moderator_profile)
        mock_db.commit.assert_called()

    def test_compile_latex_to_pdf_success(self):
        """Test successful LaTeX compilation"""
        from app.api.v1.routes.contentModerator import compile_latex_to_pdf
        
        latex_content = "\\documentclass{beamer}\\begin{document}\\frame{Test}\\end{document}"
        topic = "Test Topic"
        
        with patch('tempfile.TemporaryDirectory') as mock_tempdir, \
             patch('asyncio.to_thread') as mock_to_thread, \
             patch('os.path.exists', return_value=True), \
             patch('builtins.open', create=True) as mock_open:
            
            # Mock temporary directory
            mock_temp_context = Mock()
            mock_temp_context.__enter__ = Mock(return_value="/tmp/test")
            mock_temp_context.__exit__ = Mock(return_value=None)
            mock_tempdir.return_value = mock_temp_context
            
            # Mock successful subprocess
            mock_process = Mock()
            mock_process.returncode = 0
            mock_to_thread.return_value = mock_process
            
            # Mock file operations
            mock_file_context = Mock()
            mock_file_context.__enter__ = Mock()
            mock_file_context.__exit__ = Mock()
            
            def mock_open_side_effect(path, mode="r", encoding=None):
                if "slides.pdf" in path and "rb" in mode:
                    mock_pdf_file = Mock()
                    mock_pdf_file.__enter__ = Mock(return_value=Mock(read=Mock(return_value=b"mock pdf")))
                    mock_pdf_file.__exit__ = Mock()
                    return mock_pdf_file
                return mock_file_context
            
            mock_open.side_effect = mock_open_side_effect
            
            # Act
            result = asyncio.run(compile_latex_to_pdf(latex_content, topic))
            
            # Assert
            assert result == b"mock pdf"

    def test_compile_latex_to_pdf_failure(self):
        """Test LaTeX compilation failure"""
        from app.api.v1.routes.contentModerator import compile_latex_to_pdf
        
        latex_content = "\\invalid{latex}"
        topic = "Test Topic"
        
        with patch('tempfile.TemporaryDirectory') as mock_tempdir, \
             patch('asyncio.to_thread') as mock_to_thread:
            
            # Mock temporary directory
            mock_temp_context = Mock()
            mock_temp_context.__enter__ = Mock(return_value="/tmp/test")
            mock_temp_context.__exit__ = Mock(return_value=None)
            mock_tempdir.return_value = mock_temp_context
            
            # Mock failed subprocess
            mock_process = Mock()
            mock_process.returncode = 1
            mock_process.stderr.decode.return_value = "LaTeX error"
            mock_to_thread.return_value = mock_process
            
            # Act & Assert
            with pytest.raises(Exception, match="Error compiling LaTeX"):
                asyncio.run(compile_latex_to_pdf(latex_content, topic))

    def test_track_moderation_activity_content(self, mock_moderator_user):
        """Test tracking moderation activity for content"""
        from app.api.v1.routes.contentModerator import track_moderation_activity
        
        mock_db = Mock()
        
        # Mock no existing profile
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Act
        asyncio.run(track_moderation_activity(
            moderator_id=mock_moderator_user["uid"],
            db=mock_db,
            content_id="content-123"
        ))
        
        # Assert
        mock_db.add.assert_called()  # Profile and history should be added
        mock_db.commit.assert_called()

    def test_track_moderation_activity_quiz(self, mock_moderator_user):
        """Test tracking moderation activity for quiz"""
        from app.api.v1.routes.contentModerator import track_moderation_activity
        
        mock_db = Mock()
        
        # Mock no existing profile
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Act
        asyncio.run(track_moderation_activity(
            moderator_id=mock_moderator_user["uid"],
            db=mock_db,
            quiz_id="quiz-123"
        ))
        
        # Assert
        mock_db.add.assert_called()  # Profile and history should be added
        mock_db.commit.assert_called()

    def test_check_moderator_access_true(self, mock_moderator_user):
        """Test moderator access check for valid moderator"""
        from app.api.v1.routes.contentModerator import check_moderator_access
        
        mock_db = Mock()
        mock_user = Mock()
        mock_user.is_moderator = True
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        # Act
        result = asyncio.run(check_moderator_access(mock_moderator_user, mock_db))
        
        # Assert
        assert result is True

    def test_check_moderator_access_false(self, mock_non_moderator_user):
        """Test moderator access check for non-moderator"""
        from app.api.v1.routes.contentModerator import check_moderator_access
        
        mock_db = Mock()
        mock_user = Mock()
        mock_user.is_moderator = False
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        # Act
        result = asyncio.run(check_moderator_access(mock_non_moderator_user, mock_db))
        
        # Assert
        assert result is False

    def test_check_moderator_access_no_user(self, mock_non_moderator_user):
        """Test moderator access check for non-existent user"""
        from app.api.v1.routes.contentModerator import check_moderator_access
        
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Act
        result = asyncio.run(check_moderator_access(mock_non_moderator_user, mock_db))
        
        # Assert
        assert result is None  # Function returns None when user not found

    # Additional comprehensive test cases for better coverage
    
    def test_track_moderation_activity_error_handling(self, mock_moderator_user):
        """Test error handling in track_moderation_activity function"""
        from app.api.v1.routes.contentModerator import track_moderation_activity
        
        mock_db = Mock()
        mock_db.commit.side_effect = Exception("Database error")
        
        # Should not raise exception, just log error and rollback
        asyncio.run(track_moderation_activity(
            moderator_id=mock_moderator_user["uid"],
            db=mock_db,
            content_id="content-123"
        ))
        
        mock_db.rollback.assert_called()

    def test_moderate_content_with_firebase_storage_error(self, mock_moderator_user, sample_pending_content):
        """Test moderate content when Firebase storage operations fail"""
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
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = sample_pending_content
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        content_id = str(sample_pending_content.id)
        request_data = {
            "raw_content": "\\documentclass{beamer}\\begin{document}\\end{document}"
        }

        with patch('firebase_admin.storage.bucket') as mock_bucket:
            # Mock bucket to raise exception
            mock_bucket.side_effect = Exception("Firebase storage error")

            response = client.put(f"/api/v1/content-moderator/{content_id}/moderate", json=request_data)

        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()

    def test_get_content_raw_content_http_error(self, mock_moderator_user, sample_pending_content):
        """Test raw content retrieval when HTTP request fails"""
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
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = sample_pending_content
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        content_id = str(sample_pending_content.id)

        with patch('requests.get') as mock_requests:
            # Mock HTTP request failure
            mock_response = Mock()
            mock_response.raise_for_status.side_effect = Exception("HTTP 404 Not Found")
            mock_requests.return_value = mock_response

            response = client.get(f"/api/v1/content-moderator/{content_id}/raw_content")

        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()

    def test_create_moderator_profile_database_error(self, mock_moderator_user):
        """Test moderator profile creation with database error"""
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
        mock_db.commit.side_effect = Exception("Database commit failed")

        request_data = {
            "domains": ["Computer Science"],
            "topics": ["Python"]
        }

        response = client.post("/api/v1/content-moderator/profile", json=request_data)

        assert response.status_code == 500
        mock_db.rollback.assert_called()

    def test_update_moderator_profile_database_error(self, mock_moderator_user, sample_moderator_profile):
        """Test moderator profile update with database error"""
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
                mock_query.filter.return_value.first.return_value = sample_moderator_profile
            elif model in [ModeratorDomain, ModeratorTopic]:
                mock_query.filter.return_value.delete.return_value = None
                return mock_query
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect
        mock_db.commit.side_effect = Exception("Database commit failed")

        request_data = {
            "domains": ["Updated Domain"],
            "topics": ["Updated Topic"]
        }

        response = client.put("/api/v1/content-moderator/profile", json=request_data)

        assert response.status_code == 500
        mock_db.rollback.assert_called()

    def test_delete_moderator_profile_database_error(self, mock_moderator_user, sample_moderator_profile):
        """Test moderator profile deletion with database error"""
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
                mock_query.filter.return_value.first.return_value = sample_moderator_profile
            elif model in [ModeratorDomain, ModeratorTopic]:
                mock_query.filter.return_value.delete.return_value = None
                return mock_query
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect
        mock_db.commit.side_effect = Exception("Database commit failed")

        response = client.delete("/api/v1/content-moderator/profile")

        assert response.status_code == 500
        mock_db.rollback.assert_called()

    def test_moderate_quiz_database_error(self, mock_moderator_user, sample_quiz):
        """Test quiz moderation with database error"""
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
                mock_query.filter.return_value.first.return_value = sample_quiz
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect
        mock_db.commit.side_effect = Exception("Database commit failed")

        quiz_id = str(sample_quiz.quiz_id)
        request_data = {
            "topic": "Updated Topic",
            "approve": True
        }

        response = client.put(f"/api/v1/content-moderator/quiz/{quiz_id}/moderate", json=request_data)

        assert response.status_code == 500
        mock_db.rollback.assert_called()

    def test_get_all_moderator_profiles_database_error(self, mock_moderator_user):
        """Test getting all moderator profiles with database error"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock database error
        mock_db.query.side_effect = Exception("Database connection failed")

        response = client.get("/api/v1/content-moderator/profiles/all")

        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()

    def test_edit_raw_content_no_existing_urls(self, mock_moderator_user, sample_pending_content):
        """Test editing raw content when no existing URLs are present"""
        app.dependency_overrides[get_current_user] = lambda: mock_moderator_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock user as moderator
        mock_user = Mock()
        mock_user.uid = mock_moderator_user["uid"]
        mock_user.is_moderator = True
        
        # Mock content with no existing URLs
        sample_pending_content.raw_source = None
        sample_pending_content.content_url = None
        
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model == User:
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == ContentItem:
                mock_query.filter.return_value.first.return_value = sample_pending_content
            elif model == ModeratorProfile:
                mock_query.filter.return_value.first.return_value = None
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        content_id = str(sample_pending_content.id)
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

            response = client.put(f"/api/v1/content-moderator/{content_id}/raw_content", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["compilation_successful"] is True
        # Should generate new paths for both raw and PDF
        mock_bucket_instance.blob.assert_called()
