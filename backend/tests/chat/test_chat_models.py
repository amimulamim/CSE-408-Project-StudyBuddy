import pytest
from datetime import datetime
from uuid import uuid4
from app.chat.model import Chat, Message, MessageFile, RoleEnum, StatusEnum
from app.core.database import get_db
from sqlalchemy.orm import Session


class TestChatModels:
    """Test chat database models"""

    def test_chat_model_creation(self):
        """Test Chat model creation with required fields"""
        chat_id = uuid4()
        user_id = "test_user_123"
        name = "Test Chat"
        
        chat = Chat(id=chat_id, name=name, user_id=user_id)
        
        assert chat.id == chat_id
        assert chat.name == name
        assert chat.user_id == user_id
        assert chat.messages == []

    def test_message_model_creation(self):
        """Test Message model creation with required fields"""
        message_id = uuid4()
        chat_id = uuid4()
        role = RoleEnum.user
        text = "Hello, this is a test message"
        status = StatusEnum.complete
        
        message = Message(
            id=message_id,
            chat_id=chat_id,
            role=role,
            text=text,
            status=status
        )
        
        assert message.id == message_id
        assert message.chat_id == chat_id
        assert message.role == role
        assert message.text == text
        assert message.status == status
        assert message.files == []

    def test_message_file_model_creation(self):
        """Test MessageFile model creation"""
        file_id = uuid4()
        message_id = uuid4()
        file_url = "https://example.com/test-file.pdf"
        
        message_file = MessageFile(
            id=file_id,
            message_id=message_id,
            file_url=file_url
        )
        
        assert message_file.id == file_id
        assert message_file.message_id == message_id
        assert message_file.file_url == file_url

    def test_role_enum_values(self):
        """Test RoleEnum has correct values"""
        assert RoleEnum.user == "user"
        assert RoleEnum.assistant == "assistant"

    def test_status_enum_values(self):
        """Test StatusEnum has correct values"""
        assert StatusEnum.complete == "complete"
        assert StatusEnum.streaming == "streaming"
        assert StatusEnum.failed == "failed"

    def test_chat_message_relationship(self):
        """Test that chat and message models have proper relationship setup"""
        chat = Chat(name="Test Chat", user_id="test_user")
        message = Message(role=RoleEnum.user, text="Test message")
        
        # Test that relationship attributes exist
        assert hasattr(chat, 'messages')
        assert hasattr(message, 'chat')
        assert hasattr(message, 'files')

    def test_message_file_relationship(self):
        """Test that message and file models have proper relationship setup"""
        message = Message(role=RoleEnum.user, text="Test message")
        message_file = MessageFile(file_url="https://example.com/file.pdf")
        
        # Test that relationship attributes exist
        assert hasattr(message, 'files')
        assert hasattr(message_file, 'message')