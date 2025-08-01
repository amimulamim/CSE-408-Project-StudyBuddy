import pytest
from unittest.mock import Mock, patch, AsyncMock, ANY
from uuid import uuid4
from fastapi.testclient import TestClient
from app.main import app
from app.chat.model import Chat, Message
from app.auth.firebase_auth import get_current_user


class TestChatRoutes:
    """Test chat API routes"""

    @pytest.fixture
    def client(self):
        """Create test client with mocked dependencies"""
        def mock_get_current_user():
            return {"uid": "test_user_123", "email": "test@example.com"}

        def mock_get_db():
            return Mock()

        app.dependency_overrides[get_current_user] = mock_get_current_user
        from app.core.database import get_db
        app.dependency_overrides[get_db] = mock_get_db

        client = TestClient(app)
        yield client
        app.dependency_overrides.clear()

    def test_create_chat_text_only(self, client):
        """Test creating new chat with text only"""
        with patch('app.api.v1.routes.chat.service') as mock_service, \
             patch('app.api.v1.routes.chat.get_chat_llm') as mock_llm, \
             patch('app.api.v1.routes.chat.prepare_chat_context') as mock_context, \
             patch('app.api.v1.routes.chat.prepare_gemini_parts') as mock_parts:

            mock_chat = Mock(spec=Chat)
            mock_chat.id = uuid4()
            mock_chat.name = "Test Chat"
            mock_chat.messages = []
            mock_service.create_chat.return_value = mock_chat

            mock_message = Mock(spec=Message)
            mock_service.add_message.return_value = (mock_message, [])

            mock_ai_response = Mock()
            mock_ai_response.text = "AI response text"

            mock_llm_instance = AsyncMock()
            mock_llm_instance.send_message.return_value = mock_ai_response
            mock_llm.return_value = mock_llm_instance

            mock_context.return_value = []
            mock_parts.return_value = [{"text": "test message"}]

            response = client.post("/api/v1/ai/chat", data={"text": "test message"})

            assert response.status_code == 200
            mock_service.create_chat.assert_called_once()
            mock_service.add_message.assert_called()

    def test_create_chat_missing_text_and_files(self, client):
        """Test creating chat with neither text nor files raises error"""
        response = client.post("/api/v1/ai/chat", data={})
        assert response.status_code == 400
        assert "Message must include text or files" in response.json()["detail"]

    def test_continue_existing_chat(self, client):
        """Test continuing an existing chat"""
        chat_id = uuid4()

        with patch('app.api.v1.routes.chat.service') as mock_service, \
             patch('app.api.v1.routes.chat.get_chat_llm') as mock_llm, \
             patch('app.api.v1.routes.chat.prepare_chat_context') as mock_context, \
             patch('app.api.v1.routes.chat.prepare_gemini_parts') as mock_parts:

            mock_chat = Mock(spec=Chat)
            mock_chat.id = chat_id
            mock_chat.name = "Existing Chat"
            mock_chat.messages = []
            mock_service.get_chat_of_user_or_404.return_value = mock_chat

            mock_message = Mock(spec=Message)
            mock_service.add_message.return_value = (mock_message, [])

            mock_ai_response = Mock()
            mock_ai_response.text = "AI response text"

            mock_llm_instance = AsyncMock()
            mock_llm_instance.send_message.return_value = mock_ai_response
            mock_llm.return_value = mock_llm_instance

            mock_context.return_value = []
            mock_parts.return_value = [{"text": "test message"}]

            response = client.post(
                "/api/v1/ai/chat",
                data={"text": "test message", "chatId": str(chat_id)}
            )

            assert response.status_code == 200
            mock_service.get_chat_of_user_or_404.assert_called_once()

    def test_chat_internal_error_handling(self, client):
        """Test internal error handling in chat creation"""
        with patch('app.api.v1.routes.chat.service') as mock_service:
            mock_service.create_chat.side_effect = Exception("Database error")

            response = client.post("/api/v1/ai/chat", data={"text": "test message"})

            assert response.status_code == 500
            assert "Internal server error" in response.json()["detail"]

    def test_list_chats(self, client):
        """Test listing user's chats"""
        with patch('app.api.v1.routes.chat.service') as mock_service:
            mock_chat1 = Mock()
            mock_chat1.id = uuid4()
            mock_chat1.name = "Chat 1"
            mock_chat2 = Mock()
            mock_chat2.id = uuid4()
            mock_chat2.name = "Chat 2"
            mock_service.get_chats_by_user.return_value = [mock_chat1, mock_chat2]

            response = client.get("/api/v1/ai/chat/list")
            assert response.status_code == 200
            data = response.json()
            assert len(data["chats"]) == 2
            assert data["chats"][0]["name"] == "Chat 1"
            assert data["chats"][1]["name"] == "Chat 2"

    def test_get_chat_messages(self, client):
        """Test getting chat messages with pagination"""
        chat_id = uuid4()

        with patch('app.api.v1.routes.chat.service') as mock_service:
            mock_chat = Mock()
            mock_chat.id = chat_id
            mock_chat.name = "Test Chat"
            mock_chat.messages = []
            mock_service.get_chat_with_paginated_messages.return_value = mock_chat

            response = client.get(f"/api/v1/ai/chat/{chat_id}?offset=0&limit=20")

            assert response.status_code == 200
            mock_service.get_chat_with_paginated_messages.assert_called_once()

    def test_delete_chat(self, client):
        """Test deleting a chat"""
        chat_id = uuid4()

        with patch('app.api.v1.routes.chat.service') as mock_service:
            mock_chat = Mock()
            mock_chat.id = chat_id
            mock_chat.name = "Delete Chat"
            mock_chat.messages = []
            mock_service.get_chat_of_user_or_404.return_value = mock_chat

            response = client.delete(f"/api/v1/ai/chat/{chat_id}")

            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Chat deleted"
            assert data["chatId"] == str(chat_id)

            mock_service.get_chat_of_user_or_404.assert_called_once()
            mock_service.delete_chat.assert_called_once_with(chat_id, ANY)

    def test_rename_chat(self, client):
        """Test renaming a chat"""
        chat_id = uuid4()
        new_name = "New Chat Name"

        with patch('app.api.v1.routes.chat.service') as mock_service:
            mock_chat = Mock()
            mock_chat.id = chat_id
            mock_chat.name = "Old Name"
            mock_chat.messages = []
            mock_service.get_chat_of_user_or_404.return_value = mock_chat

            mock_renamed_chat = Mock()
            mock_renamed_chat.id = chat_id
            mock_renamed_chat.name = new_name
            mock_service.rename_chat.return_value = mock_renamed_chat

            response = client.patch(
                f"/api/v1/ai/chat/{chat_id}/rename",
                json={"name": new_name}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["_id"] == str(chat_id)
            assert data["name"] == new_name

            mock_service.get_chat_of_user_or_404.assert_called_once()
            mock_service.rename_chat.assert_called_once_with(chat_id, new_name, ANY)

    def test_rename_chat_missing_name(self, client):
        """Test renaming chat without providing name"""
        chat_id = uuid4()
        response = client.patch(f"/api/v1/ai/chat/{chat_id}/rename", json={})
        assert response.status_code == 400
        assert "Name is required" in response.json()["detail"]

    def test_unauthorized_access(self):
        """Test that routes require authentication"""
        # Create a client without dependency overrides
        client = TestClient(app)
        
        # This should fail because no authentication is provided
        response = client.get("/api/v1/ai/chat/list")
        assert response.status_code in [401, 422, 500]  # 422 for validation error, 401 for auth error
