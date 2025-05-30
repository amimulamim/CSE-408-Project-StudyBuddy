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

    @patch('app.chat.service.upload_to_firebase')
    def test_add_message_without_files(self, mock_upload):
        """Test adding message without files"""
        mock_db = Mock(spec=Session)
        mock_db.add = Mock()
        mock_db.flush = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()
        
        chat_id = str(uuid4())
        role = "user"
        text = "Test message"
        status = "complete"
        
        # Mock the Message creation
        with patch('app.chat.service.Message') as mock_message_class:
            mock_message = Mock()
            mock_message.id = uuid4()
            mock_message_class.return_value = mock_message
            
            result = service.add_message(mock_db, chat_id, role, text, status)
            
            mock_message_class.assert_called_once_with(
                chat_id=chat_id, role=role, text=text, status=status
            )
            mock_db.add.assert_called_once_with(mock_message)
            mock_db.flush.assert_called_once()
            mock_db.commit.assert_called_once()
            mock_db.refresh.assert_called_once_with(mock_message)
            
            message, uploaded_files = result
            assert message == mock_message
            assert uploaded_files == []

    @patch('app.chat.service.upload_to_firebase')
    def test_add_message_with_files(self, mock_upload):
        """Test adding message with files"""
        mock_db = Mock(spec=Session)
        mock_db.add = Mock()
        mock_db.flush = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()
        
        chat_id = str(uuid4())
        role = "user"
        text = "Test message with file"
        status = "complete"
        
        # Mock file upload
        mock_file = Mock(spec=UploadFile)
        files = [mock_file]
        mock_upload.return_value = "https://firebase.com/uploaded-file.pdf"
        
        # Mock the Message and MessageFile creation
        with patch('app.chat.service.Message') as mock_message_class, \
             patch('app.chat.service.MessageFile') as mock_message_file_class:
            
            mock_message = Mock()
            mock_message.id = uuid4()
            mock_message_class.return_value = mock_message
            
            mock_message_file = Mock()
            mock_message_file_class.return_value = mock_message_file
            
            result = service.add_message(mock_db, chat_id, role, text, status, files)
            
            mock_message_class.assert_called_once_with(
                chat_id=chat_id, role=role, text=text, status=status
            )
            mock_upload.assert_called_once_with(mock_file)
            mock_message_file_class.assert_called_once_with(
                message_id=mock_message.id, 
                file_url="https://firebase.com/uploaded-file.pdf"
            )
            
            message, uploaded_files = result
            assert message == mock_message
            assert uploaded_files == ["https://firebase.com/uploaded-file.pdf"]

    def test_get_chats_by_user(self):
        """Test getting chats by user ID"""
        mock_db = Mock(spec=Session)
        user_id = "test_user_123"
        mock_chats = [Mock(spec=Chat), Mock(spec=Chat)]
        
        # Mock the query chain
        mock_query = Mock()
        mock_filter = Mock()
        mock_order_by = Mock()
        
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.order_by.return_value = mock_order_by
        mock_order_by.all.return_value = mock_chats
        
        result = service.get_chats_by_user(mock_db, user_id)
        
        mock_db.query.assert_called_once_with(Chat)
        assert result == mock_chats

    @patch('app.chat.service.get_chat_of_user_or_404')
    def test_get_chat_with_paginated_messages(self, mock_get_chat):
        """Test getting chat with paginated messages"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        user_id = "test_user_123"
        offset = 0
        limit = 20
        
        mock_chat = Mock(spec=Chat)
        mock_get_chat.return_value = mock_chat
        
        mock_messages = [Mock(spec=Message), Mock(spec=Message)]
        
        # Mock the query chain for messages
        mock_query = Mock()
        mock_filter = Mock()
        mock_order_by = Mock()
        mock_offset = Mock()
        mock_limit = Mock()
        mock_options = Mock()
        
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.order_by.return_value = mock_order_by
        mock_order_by.offset.return_value = mock_offset
        mock_offset.limit.return_value = mock_limit
        mock_limit.options.return_value = mock_options
        mock_options.all.return_value = mock_messages
        
        result = service.get_chat_with_paginated_messages(
            mock_db, chat_id, user_id, offset, limit
        )
        
        mock_get_chat.assert_called_once_with(mock_db, chat_id, user_id)
        mock_db.query.assert_called_once_with(Message)
        assert result == mock_chat
        assert result.messages == mock_messages

    def test_rename_chat(self):
        """Test renaming a chat"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        new_name = "New Chat Name"
        
        mock_chat = Mock(spec=Chat)
        mock_chat.name = "Old Name"
        
        # Mock the query chain
        mock_query = Mock()
        mock_filter = Mock()
        
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = mock_chat
        
        mock_db.commit = Mock()
        mock_db.refresh = Mock()
        
        result = service.rename_chat(chat_id, new_name, mock_db)
        
        mock_db.query.assert_called_once_with(Chat)
        assert mock_chat.name == new_name
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once_with(mock_chat)
        assert result == mock_chat

    def test_rename_chat_not_found(self):
        """Test renaming a chat that doesn't exist"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        new_name = "New Chat Name"
        
        # Mock the query chain to return None
        mock_query = Mock()
        mock_filter = Mock()
        
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = None
        
        result = service.rename_chat(chat_id, new_name, mock_db)
        
        assert result is None

    def test_delete_chat(self):
        """Test deleting a chat"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        
        mock_chat = Mock(spec=Chat)
        
        # Mock the query chain
        mock_query = Mock()
        mock_filter = Mock()
        
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = mock_chat
        
        mock_db.delete = Mock()
        mock_db.commit = Mock()
        
        service.delete_chat(chat_id, mock_db)
        
        mock_db.query.assert_called_once_with(Chat)
        mock_db.delete.assert_called_once_with(mock_chat)
        mock_db.commit.assert_called_once()

    def test_delete_chat_not_found(self):
        """Test deleting a chat that doesn't exist"""
        mock_db = Mock(spec=Session)
        chat_id = str(uuid4())
        
        # Mock the query chain to return None
        mock_query = Mock()
        mock_filter = Mock()
        
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.first.return_value = None
        
        mock_db.delete = Mock()
        mock_db.commit = Mock()
        
        service.delete_chat(chat_id, mock_db)
        
        # Should not call delete or commit if chat not found
        mock_db.delete.assert_not_called()
        mock_db.commit.assert_not_called()