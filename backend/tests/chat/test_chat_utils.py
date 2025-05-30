import pytest
from unittest.mock import Mock, patch, MagicMock
from uuid import uuid4
from datetime import datetime

from app.chat.utils.chatHelper import prepare_chat_context
from app.chat.model import Chat, Message, MessageFile, RoleEnum, StatusEnum
from app.chat import schema


class TestChatUtils:
    """Test chat utility functions"""

    def test_prepare_chat_context_empty_chat(self):
        """Test preparing context for empty chat"""
        chat_id = uuid4()
        mock_db = Mock()
        
        with patch('app.chat.utils.chatHelper.service') as mock_service:
            mock_service.get_chat.return_value = None
            
            result = prepare_chat_context(chat_id, mock_db)
            
            assert result == []
            mock_service.get_chat.assert_called_once_with(mock_db, chat_id)

    def test_prepare_chat_context_no_messages(self):
        """Test preparing context for chat with no messages"""
        chat_id = uuid4()
        mock_db = Mock()
        
        mock_chat = Mock(spec=Chat)
        mock_chat.messages = []
        
        with patch('app.chat.utils.chatHelper.service') as mock_service:
            mock_service.get_chat.return_value = mock_chat
            
            result = prepare_chat_context(chat_id, mock_db)
            
            assert result == []

    def test_prepare_chat_context_text_messages(self):
        """Test preparing context with text-only messages"""
        chat_id = uuid4()
        mock_db = Mock()
        
        # Create mock messages
        mock_message1 = Mock(spec=Message)
        mock_message1.role = schema.RoleEnum.user.value
        mock_message1.text = "Hello"
        mock_message1.status = schema.StatusEnum.complete.value
        mock_message1.timestamp = datetime.now()
        mock_message1.files = []
        
        mock_message2 = Mock(spec=Message)
        mock_message2.role = schema.RoleEnum.assistant.value
        mock_message2.text = "Hi there!"
        mock_message2.status = schema.StatusEnum.complete.value
        mock_message2.timestamp = datetime.now()
        mock_message2.files = []
        
        mock_chat = Mock(spec=Chat)
        mock_chat.messages = [mock_message1, mock_message2]
        
        with patch('app.chat.utils.chatHelper.service') as mock_service:
            mock_service.get_chat.return_value = mock_chat
            
            result = prepare_chat_context(chat_id, mock_db)
            
            assert len(result) == 2
            assert result[0]["role"] == "user"
            assert result[0]["parts"][0]["text"] == "Hello"
            assert result[1]["role"] == "model"
            assert result[1]["parts"][0]["text"] == "Hi there!"

    def test_prepare_chat_context_filters_incomplete_messages(self):
        """Test that incomplete messages are filtered out"""
        chat_id = uuid4()
        mock_db = Mock()
        
        # Create mock messages with different statuses
        mock_message1 = Mock(spec=Message)
        mock_message1.role = schema.RoleEnum.user.value
        mock_message1.text = "Complete message"
        mock_message1.status = schema.StatusEnum.complete.value
        mock_message1.timestamp = datetime.now()
        mock_message1.files = []
        
        mock_message2 = Mock(spec=Message)
        mock_message2.role = schema.RoleEnum.user.value
        mock_message2.text = "Failed message"
        mock_message2.status = schema.StatusEnum.failed.value
        mock_message2.timestamp = datetime.now()
        mock_message2.files = []
        
        mock_message3 = Mock(spec=Message)
        mock_message3.role = schema.RoleEnum.user.value
        mock_message3.text = "Streaming message"
        mock_message3.status = schema.StatusEnum.streaming.value
        mock_message3.timestamp = datetime.now()
        mock_message3.files = []
        
        mock_chat = Mock(spec=Chat)
        mock_chat.messages = [mock_message1, mock_message2, mock_message3]
        
        with patch('app.chat.utils.chatHelper.service') as mock_service:
            mock_service.get_chat.return_value = mock_chat
            
            result = prepare_chat_context(chat_id, mock_db)
            
            # Only complete message should be included
            assert len(result) == 1
            assert result[0]["parts"][0]["text"] == "Complete message"

    def test_prepare_chat_context_limits_to_20_messages(self):
        """Test that context is limited to last 20 messages"""
        chat_id = uuid4()
        mock_db = Mock()
        
        # Create 25 mock messages
        mock_messages = []
        for i in range(25):
            mock_message = Mock(spec=Message)
            mock_message.role = schema.RoleEnum.user.value
            mock_message.text = f"Message {i}"
            mock_message.status = schema.StatusEnum.complete.value
            mock_message.timestamp = datetime(2024, 1, 1, 12, i)  # Different timestamps
            mock_message.files = []
            mock_messages.append(mock_message)
        
        mock_chat = Mock(spec=Chat)
        mock_chat.messages = mock_messages
        
        with patch('app.chat.utils.chatHelper.service') as mock_service:
            mock_service.get_chat.return_value = mock_chat
            
            result = prepare_chat_context(chat_id, mock_db)
            
            # Should only include last 20 messages
            assert len(result) == 20
            # Should include messages 5-24 (last 20)
            assert result[0]["parts"][0]["text"] == "Message 5"
            assert result[-1]["parts"][0]["text"] == "Message 24"

    @patch('app.chat.utils.chatHelper.fetch_file_bytes')
    @patch('app.chat.utils.chatHelper.mimetypes.guess_type')
    def test_prepare_chat_context_with_image_file(self, mock_guess_type, mock_fetch_bytes):
        """Test preparing context with image files"""
        chat_id = uuid4()
        mock_db = Mock()
        
        # Mock file
        mock_file = Mock(spec=MessageFile)
        mock_file.file_url = "https://example.com/image.jpg"
        
        # Create mock message with file
        mock_message = Mock(spec=Message)
        mock_message.role = schema.RoleEnum.user.value
        mock_message.text = "Check this image"
        mock_message.status = schema.StatusEnum.complete.value
        mock_message.timestamp = datetime.now()
        mock_message.files = [mock_file]
        
        mock_chat = Mock(spec=Chat)
        mock_chat.messages = [mock_message]
        
        # Setup mocks
        mock_guess_type.return_value = ("image/jpeg", None)
        mock_fetch_bytes.return_value = b"fake_image_data"
        
        with patch('app.chat.utils.chatHelper.service') as mock_service:
            mock_service.get_chat.return_value = mock_chat
            
            result = prepare_chat_context(chat_id, mock_db)
            
            assert len(result) == 1
            assert len(result[0]["parts"]) == 2
            assert result[0]["parts"][0]["text"] == "Check this image"
            assert "inline_data" in result[0]["parts"][1]
            assert result[0]["parts"][1]["inline_data"]["mime_type"] == "image/jpeg"

    @patch('app.chat.utils.chatHelper.fetch_file_bytes')
    @patch('app.chat.utils.chatHelper.mimetypes.guess_type')
    def test_prepare_chat_context_with_text_file(self, mock_guess_type, mock_fetch_bytes):
        """Test preparing context with text files"""
        chat_id = uuid4()
        mock_db = Mock()
        
        # Mock file
        mock_file = Mock(spec=MessageFile)
        mock_file.file_url = "https://example.com/document.txt"
        
        # Create mock message with file
        mock_message = Mock(spec=Message)
        mock_message.role = schema.RoleEnum.user.value
        mock_message.text = "Check this document"
        mock_message.status = schema.StatusEnum.complete.value
        mock_message.timestamp = datetime.now()
        mock_message.files = [mock_file]
        
        mock_chat = Mock(spec=Chat)
        mock_chat.messages = [mock_message]
        
        # Setup mocks
        mock_guess_type.return_value = ("text/plain", None)
        mock_fetch_bytes.return_value = b"This is text content"
        
        with patch('app.chat.utils.chatHelper.service') as mock_service:
            mock_service.get_chat.return_value = mock_chat
            
            result = prepare_chat_context(chat_id, mock_db)
            
            assert len(result) == 1
            assert len(result[0]["parts"]) == 2
            assert result[0]["parts"][0]["text"] == "Check this document"
            assert "[Content from historical file:" in result[0]["parts"][1]["text"]
            assert "This is text content" in result[0]["parts"][1]["text"]

    @patch('app.chat.utils.chatHelper.fetch_file_bytes')
    @patch('app.chat.utils.chatHelper._process_pdf_data')
    @patch('app.chat.utils.chatHelper.mimetypes.guess_type')
    def test_prepare_chat_context_with_pdf_file(self, mock_guess_type, mock_process_pdf, mock_fetch_bytes):
        """Test preparing context with PDF files"""
        chat_id = uuid4()
        mock_db = Mock()
        
        # Mock file
        mock_file = Mock(spec=MessageFile)
        mock_file.file_url = "https://example.com/document.pdf"
        
        # Create mock message with file
        mock_message = Mock(spec=Message)
        mock_message.role = schema.RoleEnum.user.value
        mock_message.text = "Check this PDF"
        mock_message.status = schema.StatusEnum.complete.value
        mock_message.timestamp = datetime.now()
        mock_message.files = [mock_file]
        
        mock_chat = Mock(spec=Chat)
        mock_chat.messages = [mock_message]
        
        # Setup mocks
        mock_guess_type.return_value = ("application/pdf", None)
        mock_fetch_bytes.return_value = b"fake_pdf_data"
        mock_process_pdf.return_value = [{"text": "PDF content"}]
        
        with patch('app.chat.utils.chatHelper.service') as mock_service:
            mock_service.get_chat.return_value = mock_chat
            
            result = prepare_chat_context(chat_id, mock_db)
            
            assert len(result) == 1
            assert len(result[0]["parts"]) == 2
            assert result[0]["parts"][0]["text"] == "Check this PDF"
            assert result[0]["parts"][1]["text"] == "PDF content"
            mock_process_pdf.assert_called_once_with(b"fake_pdf_data", mock_file.file_url)

    @patch('app.chat.utils.chatHelper.fetch_file_bytes')
    @patch('app.chat.utils.chatHelper.mimetypes.guess_type')
    def test_prepare_chat_context_file_fetch_error(self, mock_guess_type, mock_fetch_bytes):
        """Test handling file fetch errors"""
        chat_id = uuid4()
        mock_db = Mock()
        
        # Mock file
        mock_file = Mock(spec=MessageFile)
        mock_file.file_url = "https://example.com/broken-file.txt"
        
        # Create mock message with file
        mock_message = Mock(spec=Message)
        mock_message.role = schema.RoleEnum.user.value
        mock_message.text = "Check this file"
        mock_message.status = schema.StatusEnum.complete.value
        mock_message.timestamp = datetime.now()
        mock_message.files = [mock_file]
        
        mock_chat = Mock(spec=Chat)
        mock_chat.messages = [mock_message]
        
        # Setup mocks
        mock_guess_type.return_value = ("text/plain", None)
        mock_fetch_bytes.side_effect = Exception("Network error")
        
        with patch('app.chat.utils.chatHelper.service') as mock_service:
            mock_service.get_chat.return_value = mock_chat
            
            result = prepare_chat_context(chat_id, mock_db)
            
            assert len(result) == 1
            assert len(result[0]["parts"]) == 2
            assert result[0]["parts"][0]["text"] == "Check this file"
            assert "[An unexpected error occurred with historical file:" in result[0]["parts"][1]["text"]

    def test_prepare_chat_context_role_mapping(self):
        """Test correct role mapping from database to Gemini format"""
        chat_id = uuid4()
        mock_db = Mock()
        
        # Create mock messages with different roles
        mock_user_message = Mock(spec=Message)
        mock_user_message.role = schema.RoleEnum.user.value
        mock_user_message.text = "User message"
        mock_user_message.status = schema.StatusEnum.complete.value
        mock_user_message.timestamp = datetime.now()
        mock_user_message.files = []
        
        mock_assistant_message = Mock(spec=Message)
        mock_assistant_message.role = schema.RoleEnum.assistant.value
        mock_assistant_message.text = "Assistant message"
        mock_assistant_message.status = schema.StatusEnum.complete.value
        mock_assistant_message.timestamp = datetime.now()
        mock_assistant_message.files = []
        
        mock_chat = Mock(spec=Chat)
        mock_chat.messages = [mock_user_message, mock_assistant_message]
        
        with patch('app.chat.utils.chatHelper.service') as mock_service:
            mock_service.get_chat.return_value = mock_chat
            
            result = prepare_chat_context(chat_id, mock_db)
            
            assert len(result) == 2
            assert result[0]["role"] == "user"  # user stays user
            assert result[1]["role"] == "model"  # assistant becomes model for Gemini