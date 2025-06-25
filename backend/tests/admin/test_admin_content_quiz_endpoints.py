import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
from datetime import datetime, timezone

# Mock Firebase initialization before importing app modules
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.main import app
    from app.auth.firebase_auth import get_current_user
    from app.core.database import get_db
    from app.admin.schema import PaginationQuery

client = TestClient(app)


class TestAdminContentQuizEndpoints:
    """Test admin endpoints for content moderation, quiz management, and search functionality"""

    @pytest.fixture
    def admin_user(self):
        """Mock admin user"""
        return {"uid": "admin123", "is_admin": True}

    @pytest.fixture
    def regular_user(self):
        """Mock regular user"""
        return {"uid": "user123", "is_admin": False}

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock()

    def setup_admin_auth(self, admin_user, mock_db):
        """Setup admin authentication and database"""
        app.dependency_overrides[get_current_user] = lambda: admin_user
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock the is_user_admin function to return True for admin tests
        self.admin_patcher = patch('app.users.service.is_user_admin')
        self.mock_is_admin = self.admin_patcher.start()
        self.mock_is_admin.return_value = admin_user.get('is_admin', False)
        
        # Also patch the require_admin_access function import in routes
        self.route_admin_patcher = patch('app.api.v1.routes.admin.is_user_admin')
        self.mock_route_admin = self.route_admin_patcher.start()
        self.mock_route_admin.return_value = admin_user.get('is_admin', False)

    def teardown_overrides(self):
        """Cleanup dependency overrides"""
        app.dependency_overrides.clear()
        if hasattr(self, 'admin_patcher'):
            self.admin_patcher.stop()
        if hasattr(self, 'route_admin_patcher'):
            self.route_admin_patcher.stop()

    def test_get_all_content_success(self, admin_user, mock_db):
        """Test getting all generated content successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.get_all_content_paginated') as mock_get_content:
                # Arrange
                mock_content = [
                    {
                        "id": "content123",
                        "user_id": "user123",
                        "title": "Test Content",
                        "content_type": "summary",
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                ]
                mock_get_content.return_value = (mock_content, 1)

                # Act
                response = client.get("/api/v1/admin/content?offset=0&size=20")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "content" in data
                assert "total" in data
                assert data["total"] == 1
                assert len(data["content"]) == 1
                
        finally:
            self.teardown_overrides()

    def test_moderate_content_delete_success(self, admin_user, mock_db):
        """Test moderating content by deleting it successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.users.service.is_user_moderator') as mock_is_moderator, \
                 patch('app.admin.service.moderate_content') as mock_moderate, \
                 patch('app.admin.service.create_admin_log'):
                
                # Arrange
                mock_is_moderator.return_value = True
                mock_moderate.return_value = True

                # Act
                response = client.delete("/api/v1/admin/content/content123?action=delete")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "message" in data
                assert "content_id" in data
                assert data["content_id"] == "content123"
                assert "deleted successfully" in data["message"]
                
        finally:
            self.teardown_overrides()

    def test_moderate_content_flag_success(self, admin_user, mock_db):
        """Test moderating content by flagging it successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.users.service.is_user_moderator') as mock_is_moderator, \
                 patch('app.admin.service.moderate_content') as mock_moderate, \
                 patch('app.admin.service.create_admin_log'):
                
                # Arrange
                mock_is_moderator.return_value = True
                mock_moderate.return_value = True

                # Act
                response = client.delete("/api/v1/admin/content/content123?action=flag")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "flagged successfully" in data["message"]
                
        finally:
            self.teardown_overrides()

    def test_moderate_content_unauthorized(self, regular_user, mock_db):
        """Test content moderation without proper privileges"""
        self.setup_admin_auth(regular_user, mock_db)

        try:
            with patch('app.users.service.is_user_moderator') as mock_is_moderator:
                # Arrange
                mock_is_moderator.return_value = False

                # Act
                response = client.delete("/api/v1/admin/content/content123")

                # Assert
                assert response.status_code == 403
                
        finally:
            self.teardown_overrides()

    def test_moderate_content_not_found(self, admin_user, mock_db):
        """Test moderating non-existent content"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.users.service.is_user_moderator') as mock_is_moderator, \
                 patch('app.admin.service.moderate_content') as mock_moderate:
                
                # Arrange
                mock_is_moderator.return_value = True
                mock_moderate.return_value = False

                # Act
                response = client.delete("/api/v1/admin/content/nonexistent")

                # Assert
                assert response.status_code == 404
                
        finally:
            self.teardown_overrides()

    def test_get_all_quiz_results_success(self, admin_user, mock_db):
        """Test getting all quiz results successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.get_all_quiz_results_paginated') as mock_get_results:
                # Arrange
                mock_results = [
                    {
                        "id": "result123",
                        "quiz_id": "quiz123",
                        "user_id": "user123",
                        "score": 8,
                        "total": 10,
                        "percentage": 80.0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                ]
                mock_get_results.return_value = (mock_results, 1)

                # Act
                response = client.get("/api/v1/admin/quiz-results?offset=0&size=20")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "quiz_results" in data
                assert "total" in data
                assert data["total"] == 1
                assert len(data["quiz_results"]) == 1
                
        finally:
            self.teardown_overrides()

    def test_get_quiz_details_success(self, admin_user, mock_db):
        """Test getting detailed quiz information successfully"""
        self.setup_admin_auth(admin_user, mock_db)
        
        try:
            # Arrange - Mock the database queries directly through mock_db
            mock_quiz = Mock()
            mock_quiz.quiz_id = "quiz123"
            mock_quiz.user_id = "user123"
            mock_quiz.created_at = datetime.now(timezone.utc)

            mock_question = Mock()
            mock_question.id = "q1"
            mock_question.question_text = "What is 2+2?"
            mock_question.type = Mock()
            mock_question.type.value = "multiple_choice"
            mock_question.difficulty = Mock()
            mock_question.difficulty.value = "easy"
            mock_question.marks = 1
            mock_question.options = ["2", "3", "4", "5"]
            mock_question.correct_answer = "4"

            mock_result = Mock()
            mock_result.id = "r1"
            mock_result.user_id = "user123"
            mock_result.score = 8
            mock_result.total = 10
            mock_result.created_at = datetime.now(timezone.utc)
            
            # Set up different filter chains for different queries
            quiz_filter_chain = Mock()
            quiz_filter_chain.first.return_value = mock_quiz
            
            question_filter_chain = Mock()
            question_filter_chain.all.return_value = [mock_question]
            
            result_filter_chain = Mock()
            result_filter_chain.all.return_value = [mock_result]
            
            # Set up the filter chain to return different results based on call count
            call_count = 0
            def mock_filter(*args):
                nonlocal call_count
                call_count += 1
                if call_count == 1:
                    return quiz_filter_chain
                elif call_count == 2:
                    return question_filter_chain
                else:
                    return result_filter_chain
            
            mock_db.query.return_value.filter = mock_filter

            # Act
            response = client.get("/api/v1/admin/quiz/quiz123")

            # Assert
            assert response.status_code == 200
            data = response.json()
            assert "quiz" in data
            assert "questions" in data
            assert "results" in data
            assert data["quiz"]["quiz_id"] == "quiz123"
                
        finally:
            self.teardown_overrides()

    def test_get_quiz_details_not_found(self, admin_user, mock_db):
        """Test getting details for non-existent quiz"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            # Mock the database query to return None
            mock_db.query.return_value.filter.return_value.first.return_value = None

            # Act
            response = client.get("/api/v1/admin/quiz/nonexistent")

            # Assert
            assert response.status_code == 404
            assert "Quiz not found" in response.json()["detail"]
                
        finally:
            self.teardown_overrides()

    def test_delete_quiz_admin_success(self, admin_user, mock_db):
        """Test deleting a quiz as admin successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.create_admin_log'):
                # Arrange - Mock the database operations
                mock_quiz = Mock()
                mock_quiz.quiz_id = "quiz123"
                mock_quiz.user_id = "user123"
                
                mock_db.query.return_value.filter.return_value.first.return_value = mock_quiz

                # Act
                response = client.delete("/api/v1/admin/quiz/quiz123")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "message" in data
                assert "quiz_id" in data
                assert data["quiz_id"] == "quiz123"
                assert "deleted successfully" in data["message"]
                
                # Verify database operations
                mock_db.delete.assert_called_once_with(mock_quiz)
                mock_db.commit.assert_called_once()
                
        finally:
            self.teardown_overrides()

    def test_delete_quiz_admin_not_found(self, admin_user, mock_db):
        """Test deleting non-existent quiz"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            # Mock the database query to return None
            mock_db.query.return_value.filter.return_value.first.return_value = None

            # Act
            response = client.delete("/api/v1/admin/quiz/nonexistent")

            # Assert
            assert response.status_code == 404
            assert "Quiz not found" in response.json()["detail"]
                
        finally:
            self.teardown_overrides()

    def test_get_vector_db_collections_success(self, admin_user, mock_db):
        """Test getting vector database collections information successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.core.vector_db.VectorDatabaseManager') as mock_qdrant_class, \
                 patch('app.core.config.settings') as mock_settings:
                
                # Arrange
                mock_settings.QDRANT_URL = "http://localhost:6333"
                mock_settings.QDRANT_API_KEY = "test-key"
                mock_settings.QDRANT_COLLECTION_NAME = "test-collection"
                
                # Mock Qdrant client and collections
                mock_qdrant_client = Mock()
                mock_qdrant_instance = Mock()
                mock_qdrant_instance.client = mock_qdrant_client
                mock_qdrant_class.return_value = mock_qdrant_instance
                
                # Mock collections response
                mock_collection = Mock()
                mock_collection.name = "test-collection"
                
                mock_collections_response = Mock()
                mock_collections_response.collections = [mock_collection]
                mock_qdrant_client.get_collections.return_value = mock_collections_response
                
                # Mock collection info
                mock_collection_info = Mock()
                mock_collection_info.vectors_count = 1000
                mock_collection_info.status = Mock()
                mock_collection_info.status.value = "green"
                mock_collection_info.config = Mock()
                mock_collection_info.config.params = Mock()
                mock_collection_info.config.params.distance = Mock()
                mock_collection_info.config.params.distance.value = "cosine"
                mock_collection_info.config.params.size = 384
                
                mock_qdrant_client.get_collection.return_value = mock_collection_info

                # Act
                response = client.get("/api/v1/admin/vector-db/collections")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "collections" in data
                assert "total_collections" in data
                assert data["total_collections"] == 1
                assert len(data["collections"]) == 1
                assert data["collections"][0]["name"] == "test-collection"
                assert data["collections"][0]["vectors_count"] == 1000
                
        finally:
            self.teardown_overrides()

    def test_get_vector_db_collections_error(self, admin_user, mock_db):
        """Test vector database collections endpoint error handling"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.core.vector_db.VectorDatabaseManager') as mock_qdrant_class:
                # Arrange - Mock QdrantDB to raise an exception
                mock_qdrant_class.side_effect = Exception("Qdrant connection failed")

                # Act
                response = client.get("/api/v1/admin/vector-db/collections")

                # Assert
                assert response.status_code == 500
                assert "Failed to retrieve vector database collections" in response.json()["detail"]
                
        finally:
            self.teardown_overrides()

    def test_search_users_success(self, admin_user, mock_db):
        """Test searching users by name or email successfully"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.search_users_by_query') as mock_search:
                # Arrange
                mock_user = Mock()
                mock_user.uid = "user123"
                mock_user.email = "john@example.com"
                mock_user.name = "John Doe"
                mock_user.bio = "Student"
                mock_user.institution = "University"
                mock_user.role = "student"
                mock_user.avatar = None
                mock_user.auth_provider = "firebase"
                mock_user.is_admin = False
                mock_user.is_moderator = False
                mock_user.current_plan = "free"
                mock_user.location = "City"
                mock_user.study_domain = "CS"
                mock_user.interests = "AI"
                mock_user.created_at = datetime.now(timezone.utc)
                mock_user.updated_at = datetime.now(timezone.utc)
                
                mock_search.return_value = [mock_user]

                # Act
                response = client.get("/api/v1/admin/users/search?query=john&size=50")

                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "users" in data
                assert "total" in data
                assert "query" in data
                assert data["query"] == "john"
                assert data["total"] == 1
                assert len(data["users"]) == 1
                assert data["users"][0]["email"] == "john@example.com"
                
        finally:
            self.teardown_overrides()

    def test_search_users_error(self, admin_user, mock_db):
        """Test user search endpoint error handling"""
        self.setup_admin_auth(admin_user, mock_db)

        try:
            with patch('app.admin.service.search_users_by_query') as mock_search:
                # Arrange - Mock search to raise an exception
                mock_search.side_effect = Exception("Database error")

                # Act
                response = client.get("/api/v1/admin/users/search?query=john")

                # Assert
                assert response.status_code == 500
                assert "Search failed" in response.json()["detail"]
                
        finally:
            self.teardown_overrides()

    def test_all_content_quiz_endpoints_require_admin_access(self, regular_user, mock_db):
        """Test that all content and quiz management endpoints require admin access"""
        self.setup_admin_auth(regular_user, mock_db)

        content_quiz_admin_endpoints = [
            ("/api/v1/admin/content", "GET"),
            ("/api/v1/admin/content/content123", "DELETE"),
            ("/api/v1/admin/quiz-results", "GET"),
            ("/api/v1/admin/quiz/quiz123", "GET"),
            ("/api/v1/admin/quiz/quiz123", "DELETE"),
            ("/api/v1/admin/vector-db/collections", "GET"),
            ("/api/v1/admin/users/search?query=test", "GET"),
        ]

        try:
            with patch('app.admin.service.get_all_content_paginated') as mock_content, \
                 patch('app.admin.service.get_all_quiz_results_paginated') as mock_quiz_results, \
                 patch('app.admin.service.search_users_by_query') as mock_search, \
                 patch('app.admin.service.create_admin_log'), \
                 patch('app.admin.service.moderate_content') as mock_moderate, \
                 patch('app.users.service.is_user_moderator') as mock_is_moderator:
                
                # Mock services to avoid execution issues
                mock_content.return_value = ([], 0)
                mock_quiz_results.return_value = ([], 0)
                mock_search.return_value = []
                mock_moderate.return_value = True
                # Mock moderator check to return False for regular user
                mock_is_moderator.return_value = False
                
                for endpoint, method in content_quiz_admin_endpoints:
                    # Act
                    if method == "GET":
                        response = client.get(endpoint)
                    elif method == "DELETE":
                        response = client.delete(endpoint)

                    # Assert - should get 403 Forbidden for non-admin users
                    assert response.status_code == 403, f"Expected 403 for {method} {endpoint}, got {response.status_code}"
        finally:
            self.teardown_overrides()
