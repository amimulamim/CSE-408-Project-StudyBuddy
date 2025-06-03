import pytest
from unittest.mock import Mock, patch, MagicMock
from uuid import uuid4
from datetime import datetime
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.chat import service
from app.chat.model import Chat, Message, RoleEnum, StatusEnum
from app.chat import schema


class TestChatService:
    """Test chat service functions"""

    def test_generate_default_chat_name(self):
        """Test default chat name generation"""
        with patch('app.chat.service.datetime') as mock_datetime:
            mock_now = Mock()
            mock_now.strftime.return_value = "2024-01-01 12:30"
            mock_datetime.now.return_value = mock_now
            
            name = service.generate_default_chat_name()
            assert "Chat - " in name

    def test_parse_user_message_text_only(self):
        """Test parsing user message with text only"""
        text = "Hello, this is a test message"
        files = []
        
        result = service.parse_user_message(text, files)
        
        assert result["role"] == "user"
        assert result["text"] == text
        assert result["files"] == []

    def test_parse_user_message_with_files(self):
        """Test parsing user message with files"""
        text = "Message with files"
        mock_file = Mock(spec=UploadFile)
        files = [mock_file]
        
        result = service.parse_user_message(text, files)
        
        assert result["role"] == "user"
        assert result["text"] == text
        assert result["files"] == files

    def test_parse_user_message_no_files(self):
        """Test parsing user message when files is None"""
        text = "Message without files"
        files = None
        
        result = service.parse_user_message(text, files)
        
        assert result["role"] == "user"
        assert result["text"] == text
        assert result["files"] == []

    @patch('app.chat.service.chat_db.create_chat')
    def test_create_chat_with_name(self, mock_create_chat):
        """Test creating chat with provided name"""
        mock_db = Mock(spec=Session)
        user_id = "test_user_123"
        chat_name = "My Custom Chat"
        mock_chat = Mock(spec=Chat)
        mock_create_chat.return_value = mock_chat
        
        result = service.create_chat(mock_db, user_id, chat_name)
        
        mock_create_chat.assert_called_once_with(mock_db, user_id, chat_name)
        assert result == mock_chat

    @patch('app.chat.service.chat_db.create_chat')
    @patch('app.chat.service.generate_default_chat_name')
    def test_create_chat_without_name(self, mock_generate_name, mock_create_chat):
        """Test creating chat without provided name"""
        mock_db = Mock(spec=Session)
        user_id = "test_user_123"
        default_name = "Default Chat Name"
        mock_chat = Mock(spec=Chat)
        
        mock_generate_name.return_value = default_name
        mock_create_chat.return_value = mock_chat
        
        result = service.create_chat(mock_db, user_id)
        
        mock_generate_name.assert_called_once()
        mock_create_chat.assert_called_once_with(mock_db, user_id, default_name)
        assert result == mock_chat

    @patch('app.chat.service.chat_db.get_chat')
    def test_get_chat(self, mock_get_chat):
        """Test getting chat by ID"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        mock_chat = Mock(spec=Chat)
        mock_get_chat.return_value = mock_chat
        
        result = service.get_chat(mock_db, chat_id)
        
        mock_get_chat.assert_called_once_with(mock_db, chat_id)
        assert result == mock_chat

    @patch('app.chat.service.get_chat')
    def test_get_chat_of_user_or_404_success(self, mock_get_chat):
        """Test successful retrieval of user's chat"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        user_id = "test_user_123"
        
        mock_chat = Mock(spec=Chat)
        mock_chat.user_id = user_id
        mock_get_chat.return_value = mock_chat
        
        result = service.get_chat_of_user_or_404(mock_db, chat_id, user_id)
        
        mock_get_chat.assert_called_once_with(mock_db, chat_id)
        assert result == mock_chat

    @patch('app.chat.service.get_chat')
    def test_get_chat_of_user_or_404_not_found(self, mock_get_chat):
        """Test HTTPException when chat not found"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        user_id = "test_user_123"
        
        mock_get_chat.return_value = None
        
        with pytest.raises(HTTPException) as exc_info:
            service.get_chat_of_user_or_404(mock_db, chat_id, user_id)
        
        assert exc_info.value.status_code == 404
        assert "Chat not found or unauthorized" in str(exc_info.value.detail)

    @patch('app.chat.service.get_chat')
    def test_get_chat_of_user_or_404_unauthorized(self, mock_get_chat):
        """Test HTTPException when user not authorized for chat"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        user_id = "test_user_123"
        
        mock_chat = Mock(spec=Chat)
        mock_chat.user_id = "different_user_456"  # Different user
        mock_get_chat.return_value = mock_chat
        
        with pytest.raises(HTTPException) as exc_info:
            service.get_chat_of_user_or_404(mock_db, chat_id, user_id)
        
        assert exc_info.value.status_code == 404
        assert "Chat not found or unauthorized" in str(exc_info.value.detail)

    @patch('app.chat.service.chat_db.add_message')
    @patch('app.chat.service.upload_to_firebase')
    def test_add_message_without_files(self, mock_upload, mock_add_message):
        """Test adding message without files"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        role = "user"
        text = "Test message"
        status = "complete"
        
        mock_message = Mock()
        mock_add_message.return_value = mock_message
        
        result = service.add_message(mock_db, chat_id, role, text, status)
        
        mock_add_message.assert_called_once_with(mock_db, chat_id, role, text, status)
        mock_upload.assert_not_called()
        
        message, uploaded_files = result
        assert message == mock_message
        assert uploaded_files == []

    @patch('app.chat.service.chat_db.add_message_with_files')
    @patch('app.chat.service.upload_to_firebase')
    def test_add_message_with_files(self, mock_upload, mock_add_message_with_files):
        """Test adding message with files"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        role = "user"
        text = "Test message with file"
        status = "complete"
        
        # Mock file upload
        mock_file = Mock(spec=UploadFile)
        files = [mock_file]
        mock_upload.return_value = "https://firebase.com/uploaded-file.pdf"
        
        mock_message = Mock()
        mock_add_message_with_files.return_value = mock_message
        
        result = service.add_message(mock_db, chat_id, role, text, status, files)
        
        mock_upload.assert_called_once_with(mock_file)
        mock_add_message_with_files.assert_called_once_with(
            mock_db, chat_id, role, text, status, ["https://firebase.com/uploaded-file.pdf"]
        )
        
        message, uploaded_files = result
        assert message == mock_message
        assert uploaded_files == ["https://firebase.com/uploaded-file.pdf"]

    @patch('app.chat.service.chat_db.get_chats_by_user')
    def test_get_chats_by_user(self, mock_get_chats_by_user):
        """Test getting chats by user ID"""
        mock_db = Mock(spec=Session)
        user_id = "test_user_123"
        mock_chats = [Mock(spec=Chat), Mock(spec=Chat)]
        
        mock_get_chats_by_user.return_value = mock_chats
        
        result = service.get_chats_by_user(mock_db, user_id)
        
        mock_get_chats_by_user.assert_called_once_with(mock_db, user_id)
        assert result == mock_chats

    @patch('app.chat.service.chat_db.get_chat_with_paginated_messages')
    @patch('app.chat.service.get_chat_of_user_or_404')
    def test_get_chat_with_paginated_messages(self, mock_get_chat, mock_get_paginated):
        """Test getting chat with paginated messages"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        user_id = "test_user_123"
        offset = 0
        limit = 20
        
        mock_chat = Mock(spec=Chat)
        mock_chat.id = chat_id
        mock_get_chat.return_value = mock_chat
        
        mock_paginated_chat = Mock(spec=Chat)
        mock_get_paginated.return_value = mock_paginated_chat
        
        result = service.get_chat_with_paginated_messages(
            mock_db, chat_id, user_id, offset, limit
        )
        
        mock_get_chat.assert_called_once_with(mock_db, chat_id, user_id)
        mock_get_paginated.assert_called_once_with(mock_db, chat_id, offset, limit)
        assert result == mock_paginated_chat

    @patch('app.chat.service.chat_db.rename_chat')
    def test_rename_chat(self, mock_rename_chat):
        """Test renaming a chat"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        new_name = "New Chat Name"
        
        mock_chat = Mock(spec=Chat)
        mock_chat.name = new_name
        mock_rename_chat.return_value = mock_chat
        
        result = service.rename_chat(chat_id, new_name, mock_db)
        
        mock_rename_chat.assert_called_once_with(chat_id, new_name, mock_db)
        assert result == mock_chat

    @patch('app.chat.service.chat_db.rename_chat')
    def test_rename_chat_not_found(self, mock_rename_chat):
        """Test renaming a chat that doesn't exist"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        new_name = "New Chat Name"
        
        mock_rename_chat.return_value = None
        
        result = service.rename_chat(chat_id, new_name, mock_db)
        
        mock_rename_chat.assert_called_once_with(chat_id, new_name, mock_db)
        assert result is None

    @patch('app.chat.service.chat_db.delete_chat')
    def test_delete_chat(self, mock_delete_chat):
        """Test deleting a chat"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        
        mock_delete_chat.return_value = True
        
        result = service.delete_chat(chat_id, mock_db)
        
        mock_delete_chat.assert_called_once_with(chat_id, mock_db)
        assert result is True

    @patch('app.chat.service.chat_db.delete_chat')
    def test_delete_chat_not_found(self, mock_delete_chat):
        """Test deleting a chat that doesn't exist"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        
        mock_delete_chat.return_value = False
        
        result = service.delete_chat(chat_id, mock_db)
        
        mock_delete_chat.assert_called_once_with(chat_id, mock_db)
        assert result is False