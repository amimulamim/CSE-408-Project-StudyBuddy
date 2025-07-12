import pytest
import json
import uuid
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from datetime import datetime, timezone

# Mock Firebase initialization before importing app modules
with patch('firebase_admin.credentials.Certificate'), \
     patch('firebase_admin.initialize_app'), \
     patch('firebase_admin._apps', [MagicMock()]):
    from app.main import app
    from app.content_generator.models import ContentItem
    from app.document_upload.model import UserCollection
    from app.api.v1.routes.content import ContentGenerateRequest, UpdateTopicRequest
    from app.auth.firebase_auth import get_current_user
    from app.core.database import get_db

client = TestClient(app)


class TestContentRoutes:
    """Test content routes endpoints"""

    @pytest.fixture
    def mock_user(self):
        """Mock user data"""
        return {"uid": "test-user-123", "email": "test@example.com"}

    @pytest.fixture
    def sample_content_item(self):
        """Sample content item for testing"""
        return ContentItem(
            id=str(uuid.uuid4()),
            user_id="test-user-123",
            content_url="https://example.com/content.json",
            topic="Python Programming",
            content_type="flashcards",
            created_at=datetime.now(timezone.utc)
        )

    @pytest.fixture
    def sample_collection(self):
        """Sample user collection for testing"""
        return UserCollection(
            user_id="test-user-123",
            collection_name="default",
            full_collection_name="test-user-123_default"
        )

    def setup_method(self):
        """Setup method to clear dependency overrides before each test"""
        app.dependency_overrides.clear()

    def teardown_method(self):
        """Teardown method to clear dependency overrides after each test"""
        app.dependency_overrides.clear()

    def test_generate_content_flashcards_success(self, mock_user, sample_collection):
        """Test successful flashcard generation"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock collection query
        mock_db.query.return_value.filter.return_value.first.return_value = sample_collection
        
        # Mock created content query
        mock_content_item = Mock()
        mock_content_item.id = "test-content-id"
        mock_content_item.content_type = "flashcards"
        mock_content_item.created_at = datetime.now(timezone.utc)
        mock_db.query.return_value.filter.return_value.first.return_value = mock_content_item

        request_data = {
            "contentType": "flashcards",
            "contentTopic": "Python Programming",
            "difficulty": "medium",
            "length": "short",
            "tone": "instructive",
            "collection_name": "default"
        }

        with patch('app.api.v1.routes.content.ContentGenerator') as mock_content_gen, \
             patch('uuid.uuid4', return_value=Mock(hex="test-content-id")):
            
            # Mock content generator
            mock_generator_instance = Mock()
            mock_content_gen.return_value = mock_generator_instance
            mock_generator_instance.generate_and_store_content = AsyncMock()

            # Act
            response = client.post("/api/v1/content/generate", json=request_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["metadata"]["type"] == "flashcards"
        assert data["metadata"]["topic"] == "Python Programming"
        assert not data["metadata"]["needsModeration"]
        mock_generator_instance.generate_and_store_content.assert_called_once()

    def test_generate_content_slides_pending(self, mock_user, sample_collection):
        """Test slide generation that requires moderation"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock collection query
        mock_db.query.return_value.filter.return_value.first.return_value = sample_collection
        
        # Mock created content query - slides pending
        mock_content_item = Mock()
        mock_content_item.id = "test-content-id"
        mock_content_item.content_type = "slides_pending"
        mock_content_item.created_at = datetime.now(timezone.utc)
        mock_db.query.return_value.filter.return_value.first.return_value = mock_content_item

        request_data = {
            "contentType": "slides",
            "contentTopic": "Advanced Mathematics",
            "difficulty": "hard",
            "length": "long",
            "tone": "formal",
            "collection_name": "default"
        }

        with patch('app.api.v1.routes.content.ContentGenerator') as mock_content_gen, \
             patch('uuid.uuid4', return_value=Mock(hex="test-content-id")):
            
            # Mock content generator
            mock_generator_instance = Mock()
            mock_content_gen.return_value = mock_generator_instance
            mock_generator_instance.generate_and_store_content = AsyncMock()

            # Act
            response = client.post("/api/v1/content/generate", json=request_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending_moderation"
        assert data["metadata"]["type"] == "slides"
        assert data["metadata"]["needsModeration"] is True
        assert "pending moderation" in data["message"]

    def test_generate_content_collection_not_found(self, mock_user):
        """Test content generation with non-existent collection"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock collection query - no collection found
        mock_db.query.return_value.filter.return_value.first.return_value = None

        request_data = {
            "contentType": "flashcards",
            "contentTopic": "Python Programming",
            "collection_name": "nonexistent"
        }

        # Act
        response = client.post("/api/v1/content/generate", json=request_data)

        # Assert
        assert response.status_code == 400
        assert "Collection 'nonexistent' not found" in response.json()["detail"]

    def test_generate_content_with_numeric_collection_name(self, mock_user):
        """Test content generation with numeric collection name (converted to string)"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock collection with numeric full_collection_name (will be converted to string)
        mock_collection = Mock()
        mock_collection.full_collection_name = 12345  # Will be converted to "12345"
        
        # Create separate mock for content item
        mock_content_item = Mock()
        mock_content_item.id = "test-content-id"
        mock_content_item.content_type = "flashcards"
        mock_content_item.created_at = datetime.now(timezone.utc)
        
        # Set up the query chain to return different objects for different queries
        def mock_query_side_effect(model):
            mock_query = Mock()
            if model.__name__ == 'UserCollection':
                mock_query.filter.return_value.first.return_value = mock_collection
            elif model.__name__ == 'ContentItem':
                mock_query.filter.return_value.first.return_value = mock_content_item
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect

        request_data = {
            "contentType": "flashcards",
            "contentTopic": "Python Programming",
            "collection_name": "default"
        }

        with patch('app.api.v1.routes.content.ContentGenerator') as mock_content_gen, \
             patch('uuid.uuid4', return_value=Mock(hex="test-content-id")):
            
            # Mock content generator
            mock_generator_instance = Mock()
            mock_content_gen.return_value = mock_generator_instance
            mock_generator_instance.generate_and_store_content = AsyncMock()

            # Act
            response = client.post("/api/v1/content/generate", json=request_data)

        # Assert - should succeed since numeric values are converted to strings
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        # Verify the numeric collection name was converted to string and passed correctly
        mock_generator_instance.generate_and_store_content.assert_called_once()
        call_args = mock_generator_instance.generate_and_store_content.call_args
        assert call_args[1]["full_collection_name"] == "12345"

    def test_generate_content_value_error(self, mock_user, sample_collection):
        """Test content generation with ValueError (no documents found)"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock collection query
        mock_db.query.return_value.filter.return_value.first.return_value = sample_collection

        request_data = {
            "contentType": "flashcards",
            "contentTopic": "Empty Topic",
            "collection_name": "default"
        }

        with patch('app.api.v1.routes.content.ContentGenerator') as mock_content_gen:
            # Mock content generator to raise ValueError
            mock_generator_instance = Mock()
            mock_content_gen.return_value = mock_generator_instance
            mock_generator_instance.generate_and_store_content = AsyncMock(side_effect=ValueError("No relevant documents found"))

            # Act
            response = client.post("/api/v1/content/generate", json=request_data)

        # Assert
        assert response.status_code == 400
        assert "Content generation failed" in response.json()["detail"]

    def test_generate_content_general_error(self, mock_user, sample_collection):
        """Test content generation with general error"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock collection query
        mock_db.query.return_value.filter.return_value.first.return_value = sample_collection

        request_data = {
            "contentType": "flashcards",
            "contentTopic": "Test Topic",
            "collection_name": "default"
        }

        with patch('app.api.v1.routes.content.ContentGenerator') as mock_content_gen:
            # Mock content generator to raise general exception
            mock_generator_instance = Mock()
            mock_content_gen.return_value = mock_generator_instance
            mock_generator_instance.generate_and_store_content = AsyncMock(side_effect=Exception("Unexpected error"))

            # Act
            response = client.post("/api/v1/content/generate", json=request_data)

        # Assert
        assert response.status_code == 500
        assert "Content generation failed. Please try again later." in response.json()["detail"]

    def test_get_user_content_success(self, mock_user, sample_content_item):
        """Test successful retrieval of user content"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock content query
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [sample_content_item]

        # Act
        response = client.get("/api/v1/content/user")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "contents" in data
        assert len(data["contents"]) == 1
        content = data["contents"][0]
        assert content["topic"] == "Python Programming"
        assert content["type"] == "flashcards"

    def test_get_user_content_empty(self, mock_user):
        """Test retrieval of user content when no content exists"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock empty content query
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []

        # Act
        response = client.get("/api/v1/content/user")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "contents" in data
        assert len(data["contents"]) == 0

    def test_get_user_content_error(self, mock_user):
        """Test retrieval of user content with database error"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock database error
        mock_db.query.side_effect = Exception("Database connection error")

        # Act
        response = client.get("/api/v1/content/user")

        # Assert
        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()

    def test_get_content_success(self, mock_user, sample_content_item):
        """Test successful retrieval of specific content"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock content query
        mock_db.query.return_value.filter.return_value.first.return_value = sample_content_item

        content_id = str(sample_content_item.id)

        # Mock requests.get for flashcards content fetching
        mock_flashcards_data = {
            "flashcards": [
                {"front": "What is Python?", "back": "A programming language"}
            ]
        }
        
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.json.return_value = mock_flashcards_data
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response

            # Act
            response = client.get(f"/api/v1/content/{content_id}")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["contentId"] == sample_content_item.id
        assert data["content"] == mock_flashcards_data  # For flashcards, content should be the parsed JSON
        assert data["metadata"]["type"] == "flashcards"
        assert data["metadata"]["topic"] == "Python Programming"

    def test_get_content_not_found(self, mock_user):
        """Test retrieval of non-existent content"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock content query - no content found
        mock_db.query.return_value.filter.return_value.first.return_value = None

        content_id = "nonexistent-id"

        # Act
        response = client.get(f"/api/v1/content/{content_id}")

        # Assert
        assert response.status_code == 404
        assert "Content not found" in response.json()["detail"]

    def test_get_content_error(self, mock_user):
        """Test retrieval of content with database error"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock database error
        mock_db.query.side_effect = Exception("Database connection error")

        content_id = "test-id"

        # Act
        response = client.get(f"/api/v1/content/{content_id}")

        # Assert
        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()

    def test_delete_content_success(self, mock_user, sample_content_item):
        """Test successful content deletion"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock content query
        mock_db.query.return_value.filter.return_value.first.return_value = sample_content_item

        content_id = str(sample_content_item.id)

        with patch('firebase_admin.storage.bucket') as mock_bucket:
            # Mock Firebase bucket and blob
            mock_bucket_instance = Mock()
            mock_bucket.return_value = mock_bucket_instance
            mock_bucket_instance.name = "test-bucket"
            
            mock_blob = Mock()
            mock_bucket_instance.blob.return_value = mock_blob
            mock_blob.exists.return_value = True

            # Act
            response = client.delete(f"/api/v1/content/{content_id}")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "deleted successfully" in data["message"]
        mock_blob.delete.assert_called_once()
        mock_db.delete.assert_called_once_with(sample_content_item)
        mock_db.commit.assert_called_once()

    def test_delete_content_not_found(self, mock_user):
        """Test deletion of non-existent content"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock content query - no content found
        mock_db.query.return_value.filter.return_value.first.return_value = None

        content_id = "nonexistent-id"

        # Act
        response = client.delete(f"/api/v1/content/{content_id}")

        # Assert
        assert response.status_code == 404
        assert "Content not found" in response.json()["detail"]

    def test_delete_content_error(self, mock_user, sample_content_item):
        """Test content deletion with error"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock content query
        mock_db.query.return_value.filter.return_value.first.return_value = sample_content_item

        content_id = str(sample_content_item.id)

        with patch('firebase_admin.storage.bucket', side_effect=Exception("Storage error")):
            # Act
            response = client.delete(f"/api/v1/content/{content_id}")

        # Assert
        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()
        mock_db.rollback.assert_called_once()

    def test_update_content_topic_success(self, mock_user, sample_content_item):
        """Test successful topic update"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock content query
        mock_db.query.return_value.filter.return_value.first.return_value = sample_content_item

        content_id = str(sample_content_item.id)
        new_topic = "Advanced Python Programming"

        # Act
        response = client.patch(f"/api/v1/content/topic/{content_id}", json={"topic": new_topic})

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Topic updated successfully"
        assert data["topic"] == new_topic
        assert sample_content_item.topic == new_topic
        mock_db.commit.assert_called_once()

    def test_update_content_topic_not_found(self, mock_user):
        """Test topic update for non-existent content"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock content query - no content found
        mock_db.query.return_value.filter.return_value.first.return_value = None

        content_id = "nonexistent-id"

        # Act
        response = client.patch(f"/api/v1/content/topic/{content_id}", json={"topic": "New Topic"})

        # Assert
        assert response.status_code == 404
        assert "Content not found" in response.json()["detail"]

    def test_update_content_topic_error(self, mock_user, sample_content_item):
        """Test topic update with database error"""
        # Setup dependency overrides
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        mock_db = Mock()
        app.dependency_overrides[get_db] = lambda: mock_db
        
        # Mock content query
        mock_db.query.return_value.filter.return_value.first.return_value = sample_content_item
        
        # Mock database error on commit
        mock_db.commit.side_effect = Exception("Database error")

        content_id = str(sample_content_item.id)

        # Act
        response = client.patch(f"/api/v1/content/topic/{content_id}", json={"topic": "New Topic"})

        # Assert
        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()
        mock_db.rollback.assert_called_once()

    def test_content_generate_request_validation(self):
        """Test ContentGenerateRequest model validation"""
        # Valid request
        request = ContentGenerateRequest(
            contentType="flashcards",
            contentTopic="Python Programming",
            difficulty="medium",
            length="short",
            tone="instructive",
            collection_name="default"
        )
        assert request.contentType == "flashcards"
        assert request.contentTopic == "Python Programming"

        # Test defaults
        request_minimal = ContentGenerateRequest(
            contentType="slides",
            contentTopic="Math"
        )
        assert request_minimal.difficulty == "medium"
        assert request_minimal.length == "medium"
        assert request_minimal.tone == "instructive"
        assert request_minimal.collection_name == "default"

    def test_update_topic_request_validation(self):
        """Test UpdateTopicRequest model validation"""
        request = UpdateTopicRequest(topic="New Topic")
        assert request.topic == "New Topic"
