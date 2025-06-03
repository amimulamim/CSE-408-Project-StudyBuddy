import pytest
from datetime import datetime
from uuid import uuid4
from pydantic import ValidationError
from app.chat import schema


class TestChatSchemas:
    """Test chat Pydantic schemas"""

    def test_role_enum_values(self):
        """Test RoleEnum schema values"""
        assert schema.RoleEnum.user == "user"
        assert schema.RoleEnum.assistant == "assistant"

    def test_status_enum_values(self):
        """Test StatusEnum schema values"""
        assert schema.StatusEnum.complete == "complete"
        assert schema.StatusEnum.streaming == "streaming"
        assert schema.StatusEnum.failed == "failed"

    def test_message_file_out_valid(self):
        """Test MessageFileOut schema with valid data"""
        file_id = uuid4()
        file_url = "https://example.com/test-file.pdf"
        
        message_file = schema.MessageFileOut(
            id=file_id,
            file_url=file_url
        )
        
        assert message_file.id == file_id
        assert message_file.file_url == file_url

    def test_message_out_valid(self):
        """Test MessageOut schema with valid data"""
        message_id = uuid4()
        role = schema.RoleEnum.user
        text = "Hello, this is a test message"
        status = schema.StatusEnum.complete
        timestamp = datetime.now()
        
        message = schema.MessageOut(
            id=message_id,
            role=role,
            text=text,
            status=status,
            timestamp=timestamp,
            files=[]
        )
        
        assert message.id == message_id
        assert message.role == role
        assert message.text == text
        assert message.status == status
        assert message.timestamp == timestamp
        assert message.files == []

    def test_message_out_with_files(self):
        """Test MessageOut schema with files"""
        message_id = uuid4()
        file_id = uuid4()
        
        message_file = schema.MessageFileOut(
            id=file_id,
            file_url="https://example.com/test.pdf"
        )
        
        message = schema.MessageOut(
            id=message_id,
            role=schema.RoleEnum.user,
            text="Message with file",
            status=schema.StatusEnum.complete,
            timestamp=datetime.now(),
            files=[message_file]
        )
        
        assert len(message.files) == 1
        assert message.files[0].id == file_id

    def test_chat_out_valid(self):
        """Test ChatOut schema with valid data"""
        chat_id = uuid4()
        message_id = uuid4()
        
        message = schema.MessageOut(
            id=message_id,
            role=schema.RoleEnum.user,
            text="Test message",
            status=schema.StatusEnum.complete,
            timestamp=datetime.now(),
            files=[]
        )
        
        chat = schema.ChatOut(
            id=chat_id,
            name="Test Chat",
            messages=[message]
        )
        
        assert chat.id == chat_id
        assert chat.name == "Test Chat"
        assert len(chat.messages) == 1
        assert chat.messages[0].id == message_id

    def test_chat_paginated_out_valid(self):
        """Test ChatPaginatedOut schema with valid data"""
        chat_id = uuid4()
        
        chat = schema.ChatPaginatedOut(
            id=chat_id,
            name="Test Chat",
            messages=[]
        )
        
        assert chat.id == chat_id
        assert chat.name == "Test Chat"
        assert chat.messages == []

    def test_chat_summary_valid(self):
        """Test ChatSummary schema with valid data"""
        chat_id = uuid4()
        
        chat_summary = schema.ChatSummary(
            id=chat_id,
            name="Test Chat Summary"
        )
        
        assert chat_summary.id == chat_id
        assert chat_summary.name == "Test Chat Summary"

    def test_chat_list_response_valid(self):
        """Test ChatListResponse schema with valid data"""
        chat_id = uuid4()
        
        chat_summary = schema.ChatSummary(
            id=chat_id,
            name="Test Chat"
        )
        
        chat_list = schema.ChatListResponse(
            chats=[chat_summary]
        )
        
        assert len(chat_list.chats) == 1
        assert chat_list.chats[0].id == chat_id

    def test_chat_create_request_valid(self):
        """Test ChatCreateRequest schema with valid data"""
        request = schema.ChatCreateRequest(
            text="Hello, this is a test message"
        )
        
        assert request.text == "Hello, this is a test message"
        assert request.chatId is None

    def test_chat_create_request_with_chat_id(self):
        """Test ChatCreateRequest schema with chat_id"""
        chat_id = uuid4()
        
        request = schema.ChatCreateRequest(
            text="Hello, this is a test message",
            chatId=chat_id
        )
        
        assert request.text == "Hello, this is a test message"
        assert request.chatId == chat_id

    def test_invalid_role_enum(self):
        """Test that invalid role enum raises ValidationError"""
        with pytest.raises(ValidationError):
            schema.MessageOut(
                id=uuid4(),
                role="invalid_role",  # Invalid role
                text="Test message",
                status=schema.StatusEnum.complete,
                timestamp=datetime.now(),
                files=[]
            )

    def test_invalid_status_enum(self):
        """Test that invalid status enum raises ValidationError"""
        with pytest.raises(ValidationError):
            schema.MessageOut(
                id=uuid4(),
                role=schema.RoleEnum.user,
                text="Test message",
                status="invalid_status",  # Invalid status
                timestamp=datetime.now(),
                files=[]
            )