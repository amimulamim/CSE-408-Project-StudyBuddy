import pytest
from unittest.mock import Mock, patch
from uuid import uuid4
from sqlalchemy.orm import Session

from app.chat import db
from app.chat.model import Chat, Message, MessageFile, RoleEnum, StatusEnum


class TestChatDB:
    """Test chat database operations"""

    def test_create_chat(self):
        """Test creating a new chat"""
        mock_db = Mock(spec=Session)
        mock_db.add = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()
        
        user_id = "test_user_123"
        name = "Test Chat"
        
        with patch('app.chat.db.model.Chat') as mock_chat_class:
            mock_chat = Mock(spec=Chat)
            mock_chat_class.return_value = mock_chat
            
            result = db.create_chat(mock_db, user_id, name)
            
            mock_chat_class.assert_called_once_with(name=name, user_id=user_id)
            mock_db.add.assert_called_once_with(mock_chat)
            mock_db.commit.assert_called_once()
            mock_db.refresh.assert_called_once_with(mock_chat)
            assert result == mock_chat

    def test_get_chat(self):
        """Test getting a chat by ID"""
        mock_db = Mock(spec=Session)
        chat_id = uuid4()
        mock_chat = Mock(spec=Chat)
        
        # Mock the query chain
        mock_query = Mock()
        mock_filter = Mock()
        
        mock_db.query.return_value = mock_query
        mock_query.filter_by.return_value = mock_filter
        mock_filter.first.return_value = mock_chat
        
        result = db.get_chat(mock_db, chat_id)
        
        mock_db.query.assert_called_once()
        mock_query.filter_by.assert_called_once_with(id=chat_id)
        assert result == mock_chat

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
        mock_query.filter_by.return_value = mock_filter
        mock_filter.order_by.return_value = mock_order_by
        mock_order_by.all.return_value = mock_chats
        
        result = db.get_chats_by_user(mock_db, user_id)
        
        mock_db.query.assert_called_once()
        mock_query.filter_by.assert_called_once_with(user_id=user_id)
        assert result == mock_chats

    def test_delete_chat_success(self):
        """Test deleting a chat successfully"""
        mock_db = Mock(spec=Session)
        chat_id = uuid4()
        mock_chat = Mock(spec=Chat)
        
        with patch('app.chat.db.get_chat') as mock_get_chat:
            mock_get_chat.return_value = mock_chat
            mock_db.delete = Mock()
            mock_db.commit = Mock()
            
            result = db.delete_chat(chat_id, mock_db)
            
            mock_get_chat.assert_called_once_with(mock_db, chat_id)
            mock_db.delete.assert_called_once_with(mock_chat)
            mock_db.commit.assert_called_once()
            assert result is True

    def test_delete_chat_not_found(self):
        """Test deleting a chat that doesn't exist"""
        mock_db = Mock(spec=Session)
        chat_id = uuid4()
        
        with patch('app.chat.db.get_chat') as mock_get_chat:
            mock_get_chat.return_value = None
            mock_db.delete = Mock()
            mock_db.commit = Mock()
            
            result = db.delete_chat(chat_id, mock_db)
            
            mock_get_chat.assert_called_once_with(mock_db, chat_id)
            mock_db.delete.assert_not_called()
            mock_db.commit.assert_not_called()
            assert result is False

    def test_rename_chat_success(self):
        """Test renaming a chat successfully"""
        mock_db = Mock(spec=Session)
        chat_id = uuid4()
        new_name = "New Chat Name"
        mock_chat = Mock(spec=Chat)
        mock_chat.name = "Old Name"
        
        with patch('app.chat.db.get_chat') as mock_get_chat:
            mock_get_chat.return_value = mock_chat
            mock_db.commit = Mock()
            mock_db.refresh = Mock()
            
            result = db.rename_chat(chat_id, new_name, mock_db)
            
            mock_get_chat.assert_called_once_with(mock_db, chat_id)
            assert mock_chat.name == new_name
            mock_db.commit.assert_called_once()
            mock_db.refresh.assert_called_once_with(mock_chat)
            assert result == mock_chat

    def test_rename_chat_not_found(self):
        """Test renaming a chat that doesn't exist"""
        mock_db = Mock(spec=Session)
        chat_id = uuid4()
        new_name = "New Chat Name"
        
        with patch('app.chat.db.get_chat') as mock_get_chat:
            mock_get_chat.return_value = None
            mock_db.commit = Mock()
            mock_db.refresh = Mock()
            
            result = db.rename_chat(chat_id, new_name, mock_db)
            
            mock_get_chat.assert_called_once_with(mock_db, chat_id)
            mock_db.commit.assert_not_called()
            mock_db.refresh.assert_not_called()
            assert result is None

    def test_add_message(self):
        """Test adding a simple message"""
        mock_db = Mock(spec=Session)
        mock_db.add = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()
        
        chat_id = uuid4()
        role = "user"
        text = "Test message"
        status = "complete"
        
        with patch('app.chat.db.model.Message') as mock_message_class:
            mock_message = Mock(spec=Message)
            mock_message_class.return_value = mock_message
            
            result = db.add_message(mock_db, chat_id, role, text, status)
            
            mock_message_class.assert_called_once_with(
                chat_id=chat_id, role=role, text=text, status=status
            )
            mock_db.add.assert_called_once_with(mock_message)
            mock_db.commit.assert_called_once()
            mock_db.refresh.assert_called_once_with(mock_message)
            assert result == mock_message

    def test_add_message_with_files(self):
        """Test adding a message with associated files"""
        mock_db = Mock(spec=Session)
        mock_db.add = Mock()
        mock_db.flush = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()
        
        chat_id = uuid4()
        role = "user"
        text = "Test message"
        status = "complete"
        file_urls = ["https://example.com/file1.pdf", "https://example.com/file2.png"]
        
        with patch('app.chat.db.model.Message') as mock_message_class, \
             patch('app.chat.db.model.MessageFile') as mock_message_file_class:
            
            mock_message = Mock(spec=Message)
            mock_message.id = uuid4()
            mock_message_class.return_value = mock_message
            
            mock_file1 = Mock(spec=MessageFile)
            mock_file2 = Mock(spec=MessageFile)
            mock_message_file_class.side_effect = [mock_file1, mock_file2]
            
            result = db.add_message_with_files(mock_db, chat_id, role, text, status, file_urls)
            
            mock_message_class.assert_called_once_with(
                chat_id=chat_id, role=role, text=text, status=status
            )
            mock_db.add.assert_called()
            mock_db.flush.assert_called_once()
            mock_db.commit.assert_called_once()
            mock_db.refresh.assert_called_once_with(mock_message)
            
            # Check that MessageFile instances were created for each URL
            assert mock_message_file_class.call_count == 2
            mock_message_file_class.assert_any_call(message_id=mock_message.id, file_url=file_urls[0])
            mock_message_file_class.assert_any_call(message_id=mock_message.id, file_url=file_urls[1])
            
            assert result == mock_message

    def test_get_chat_with_paginated_messages(self):
        """Test getting chat with paginated messages"""
        mock_db = Mock(spec=Session)
        chat_id = uuid4()
        offset = 0
        limit = 20
        mock_chat = Mock(spec=Chat)
        mock_messages = [Mock(spec=Message), Mock(spec=Message)]
        
        with patch('app.chat.db.get_chat') as mock_get_chat:
            mock_get_chat.return_value = mock_chat
            
            # Mock the query chain for messages
            mock_query = Mock()
            mock_filter = Mock()
            mock_order_by = Mock()
            mock_offset_mock = Mock()
            mock_limit_mock = Mock()
            mock_options = Mock()
            
            mock_db.query.return_value = mock_query
            mock_query.filter.return_value = mock_filter
            mock_filter.order_by.return_value = mock_order_by
            mock_order_by.offset.return_value = mock_offset_mock
            mock_offset_mock.limit.return_value = mock_limit_mock
            mock_limit_mock.options.return_value = mock_options
            mock_options.all.return_value = mock_messages
            
            result = db.get_chat_with_paginated_messages(mock_db, chat_id, offset, limit)
            
            mock_get_chat.assert_called_once_with(mock_db, chat_id)
            mock_db.query.assert_called_once()
            assert result == mock_chat
            assert result.messages == mock_messages

    def test_get_chat_with_paginated_messages_chat_not_found(self):
        """Test getting paginated messages when chat doesn't exist"""
        mock_db = Mock(spec=Session)
        chat_id = uuid4()
        offset = 0
        limit = 20
        
        with patch('app.chat.db.get_chat') as mock_get_chat:
            mock_get_chat.return_value = None
            
            result = db.get_chat_with_paginated_messages(mock_db, chat_id, offset, limit)
            
            mock_get_chat.assert_called_once_with(mock_db, chat_id)
            mock_db.query.assert_not_called()
            assert result is None

    def test_add_files(self):
        """Test adding files to a message"""
        mock_db = Mock(spec=Session)
        mock_db.add = Mock()
        mock_db.commit = Mock()
        
        message_id = uuid4()
        urls = ["https://example.com/file1.pdf", "https://example.com/file2.png"]
        
        with patch('app.chat.db.model.MessageFile') as mock_message_file_class:
            mock_file1 = Mock(spec=MessageFile)
            mock_file2 = Mock(spec=MessageFile)
            mock_message_file_class.side_effect = [mock_file1, mock_file2]
            
            db.add_files(mock_db, message_id, urls)
            
            assert mock_message_file_class.call_count == 2
            mock_message_file_class.assert_any_call(message_id=message_id, file_url=urls[0])
            mock_message_file_class.assert_any_call(message_id=message_id, file_url=urls[1])
            
            assert mock_db.add.call_count == 2
            mock_db.add.assert_any_call(mock_file1)
            mock_db.add.assert_any_call(mock_file2)
            mock_db.commit.assert_called_once()
