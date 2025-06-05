import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from fastapi import HTTPException
from google.genai.types import Part

from app.ai.geminiService import GeminiService
from app.ai.baseChatService import BaseChatService


class TestGeminiService:
    """Test GeminiService implementation"""

    @patch.dict('os.environ', {
        'GEMINI_API_KEY': 'test_api_key',
        'GEMINI_MODEL': 'test_model'
    })
    @patch('google.generativeai.configure')
    @patch('google.generativeai.GenerativeModel')
    def test_initialization_with_env_vars(self, mock_generative_model, mock_configure):
        """Test GeminiService initialization with environment variables"""
        mock_model_instance = Mock()
        mock_generative_model.return_value = mock_model_instance
        
        service = GeminiService()
        
        # Verify genai was configured with the API key
        mock_configure.assert_called_once_with(api_key='test_api_key')
        
        # Verify model was created with correct parameters
        mock_generative_model.assert_called_once_with(
            'test_model',
            system_instruction=service.system_instruction
        )
        
        # Verify the model is stored
        assert service.model == mock_model_instance
        assert service.model_name == 'test_model'

    @patch.dict('os.environ', {
        'GEMINI_API_KEY': 'test_api_key'
    }, clear=True)
    @patch('google.generativeai.configure')
    @patch('google.generativeai.GenerativeModel')
    def test_initialization_default_model(self, mock_generative_model, mock_configure):
        """Test GeminiService initialization with default model"""
        mock_model_instance = Mock()
        mock_generative_model.return_value = mock_model_instance
        
        service = GeminiService()
        
        # Verify default model is used
        assert service.model_name == 'models/gemini-2.0-flash'
        mock_generative_model.assert_called_once_with(
            'models/gemini-2.0-flash',
            system_instruction=service.system_instruction
        )

    @patch.dict('os.environ', {
        'GEMINI_API_KEY': 'test_api_key'
    })
    @patch('google.generativeai.configure')
    @patch('google.generativeai.GenerativeModel')
    def test_system_instruction_content(self, mock_generative_model, mock_configure):
        """Test that system instruction contains expected content"""
        service = GeminiService()
        
        system_instruction = service.system_instruction
        
        # Verify system instruction contains key academic subjects
        assert "physics" in system_instruction.lower()
        assert "chemistry" in system_instruction.lower()
        assert "math" in system_instruction.lower()
        assert "biology" in system_instruction.lower()
        assert "computer science" in system_instruction.lower()
        assert "academic assistant" in system_instruction.lower()

    @patch.dict('os.environ', {
        'GEMINI_API_KEY': 'test_api_key'
    })
    @patch('google.generativeai.configure')
    @patch('google.generativeai.GenerativeModel')
    def test_inheritance_from_base_chat_service(self, mock_generative_model, mock_configure):
        """Test that GeminiService properly inherits from BaseChatService"""
        service = GeminiService()
        
        assert isinstance(service, BaseChatService)
        assert hasattr(service, 'send_message')

    @pytest.mark.asyncio
    @patch.dict('os.environ', {
        'GEMINI_API_KEY': 'test_api_key'
    })
    @patch('google.generativeai.configure')
    @patch('google.generativeai.GenerativeModel')
    async def test_send_message_success(self, mock_generative_model, mock_configure):
        """Test successful message sending"""
        # Setup mocks
        mock_response = Mock()
        mock_response.text = "AI response text"
        
        mock_conversation = AsyncMock()
        mock_conversation.send_message_async.return_value = mock_response
        
        mock_model_instance = Mock()
        mock_model_instance.start_chat.return_value = mock_conversation
        mock_generative_model.return_value = mock_model_instance
        
        service = GeminiService()
        
        # Test data
        current_prompt_parts = ["Test message"]
        history = [{"role": "user", "content": "Previous message"}]
        
        # Execute
        result = await service.send_message(current_prompt_parts, history)
        
        # Verify
        mock_model_instance.start_chat.assert_called_once_with(history=history)
        mock_conversation.send_message_async.assert_called_once_with(current_prompt_parts)
        assert result == mock_response

    @pytest.mark.asyncio
    @patch.dict('os.environ', {
        'GEMINI_API_KEY': 'test_api_key'
    })
    @patch('google.generativeai.configure')
    @patch('google.generativeai.GenerativeModel')
    async def test_send_message_with_empty_history(self, mock_generative_model, mock_configure):
        """Test sending message with empty history"""
        # Setup mocks
        mock_response = Mock()
        mock_response.text = "AI response text"
        
        mock_conversation = AsyncMock()
        mock_conversation.send_message_async.return_value = mock_response
        
        mock_model_instance = Mock()
        mock_model_instance.start_chat.return_value = mock_conversation
        mock_generative_model.return_value = mock_model_instance
        
        service = GeminiService()
        
        # Test with None history
        result = await service.send_message(["Test message"], None)
        
        # Verify empty list is passed when history is None
        mock_model_instance.start_chat.assert_called_once_with(history=[])
        assert result == mock_response

    @pytest.mark.asyncio
    @patch.dict('os.environ', {
        'GEMINI_API_KEY': 'test_api_key'
    })
    @patch('google.generativeai.configure')
    @patch('google.generativeai.GenerativeModel')
    async def test_send_message_with_parts(self, mock_generative_model, mock_configure):
        """Test sending message with Google AI Parts objects"""
        # Setup mocks
        mock_response = Mock()
        mock_conversation = AsyncMock()
        mock_conversation.send_message_async.return_value = mock_response
        
        mock_model_instance = Mock()
        mock_model_instance.start_chat.return_value = mock_conversation
        mock_generative_model.return_value = mock_model_instance
        
        service = GeminiService()
        
        # Create mock Part objects
        mock_part = Mock(spec=Part)
        current_prompt_parts = ["Text message", mock_part]
        
        # Execute
        result = await service.send_message(current_prompt_parts, [])
        
        # Verify
        mock_conversation.send_message_async.assert_called_once_with(current_prompt_parts)
        assert result == mock_response

    @pytest.mark.asyncio
    @patch.dict('os.environ', {
        'GEMINI_API_KEY': 'test_api_key'
    })
    @patch('google.generativeai.configure')
    @patch('google.generativeai.GenerativeModel')
    async def test_send_message_gemini_api_error(self, mock_generative_model, mock_configure):
        """Test handling of Gemini API errors"""
        # Setup mocks to raise an exception
        mock_conversation = AsyncMock()
        mock_conversation.send_message_async.side_effect = Exception("API Error")
        
        mock_model_instance = Mock()
        mock_model_instance.start_chat.return_value = mock_conversation
        mock_generative_model.return_value = mock_model_instance
        
        service = GeminiService()
        
        # Test that HTTPException is raised
        with pytest.raises(HTTPException) as exc_info:
            await service.send_message(["Test message"], [])
        
        assert exc_info.value.status_code == 500
        assert "AI communication error" in str(exc_info.value.detail)
        assert "API Error" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    @patch.dict('os.environ', {
        'GEMINI_API_KEY': 'test_api_key'
    })
    @patch('google.generativeai.configure')
    @patch('google.generativeai.GenerativeModel')
    async def test_send_message_network_error(self, mock_generative_model, mock_configure):
        """Test handling of network-related errors"""
        # Setup mocks to raise a network exception
        mock_conversation = AsyncMock()
        mock_conversation.send_message_async.side_effect = ConnectionError("Network unreachable")
        
        mock_model_instance = Mock()
        mock_model_instance.start_chat.return_value = mock_conversation
        mock_generative_model.return_value = mock_model_instance
        
        service = GeminiService()
        
        # Test that HTTPException is raised
        with pytest.raises(HTTPException) as exc_info:
            await service.send_message(["Test message"], [])
        
        assert exc_info.value.status_code == 500
        assert "AI communication error" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    @patch.dict('os.environ', {
        'GEMINI_API_KEY': 'test_api_key'
    })
    @patch('google.generativeai.configure')
    @patch('google.generativeai.GenerativeModel')
    async def test_send_message_complex_history(self, mock_generative_model, mock_configure):
        """Test sending message with complex conversation history"""
        # Setup mocks
        mock_response = Mock()
        mock_conversation = AsyncMock()
        mock_conversation.send_message_async.return_value = mock_response
        
        mock_model_instance = Mock()
        mock_model_instance.start_chat.return_value = mock_conversation
        mock_generative_model.return_value = mock_model_instance
        
        service = GeminiService()
        
        # Complex history with multiple turns
        complex_history = [
            {"role": "user", "content": "What is physics?"},
            {"role": "assistant", "content": "Physics is the study of matter and energy."},
            {"role": "user", "content": "Can you explain quantum mechanics?"},
            {"role": "assistant", "content": "Quantum mechanics is a fundamental theory..."}
        ]
        
        # Execute
        result = await service.send_message(["Follow up question"], complex_history)
        
        # Verify history is passed correctly
        mock_model_instance.start_chat.assert_called_once_with(history=complex_history)
        assert result == mock_response


class TestGeminiServiceIntegration:
    """Integration tests for GeminiService"""
    
    @pytest.mark.asyncio
    @patch.dict('os.environ', {
        'GEMINI_API_KEY': 'test_api_key'
    })
    @patch('google.generativeai.configure')
    @patch('google.generativeai.GenerativeModel')
    async def test_service_can_be_used_polymorphically(self, mock_generative_model, mock_configure):
        """Test that GeminiService can be used as BaseChatService"""
        # Setup mocks
        mock_response = Mock()
        mock_conversation = AsyncMock()
        mock_conversation.send_message_async.return_value = mock_response
        
        mock_model_instance = Mock()
        mock_model_instance.start_chat.return_value = mock_conversation
        mock_generative_model.return_value = mock_model_instance
        
        # Use as BaseChatService type
        service: BaseChatService = GeminiService()
        
        # Execute
        result = await service.send_message(["Test message"], [])
        
        # Verify it works polymorphically
        assert result == mock_response
        mock_conversation.send_message_async.assert_called_once()

    @patch.dict('os.environ', {
        'GEMINI_API_KEY': 'test_api_key'
    })
    @patch('google.generativeai.configure')
    @patch('google.generativeai.GenerativeModel')
    def test_service_initialization_without_async(self, mock_generative_model, mock_configure):
        """Test that service can be initialized synchronously"""
        service = GeminiService()
        
        # Verify service is created successfully
        assert service is not None
        assert hasattr(service, 'model')
        assert hasattr(service, 'system_instruction')
        mock_configure.assert_called_once()


class TestGeminiServiceErrorCases:
    """Test error cases and edge conditions"""
    
    @patch.dict('os.environ', {}, clear=True)
    @patch('google.generativeai.configure')
    @patch('google.generativeai.GenerativeModel')
    def test_missing_api_key_env_var(self, mock_generative_model, mock_configure):
        """Test behavior when GEMINI_API_KEY environment variable is missing"""
        service = GeminiService()
        
        # Should still try to configure with None
        mock_configure.assert_called_once_with(api_key=None)

    @pytest.mark.asyncio
    @patch.dict('os.environ', {
        'GEMINI_API_KEY': 'test_api_key'
    })
    @patch('google.generativeai.configure')
    @patch('google.generativeai.GenerativeModel')
    async def test_send_message_with_empty_prompt(self, mock_generative_model, mock_configure):
        """Test sending message with empty prompt parts"""
        # Setup mocks
        mock_response = Mock()
        mock_conversation = AsyncMock()
        mock_conversation.send_message_async.return_value = mock_response
        
        mock_model_instance = Mock()
        mock_model_instance.start_chat.return_value = mock_conversation
        mock_generative_model.return_value = mock_model_instance
        
        service = GeminiService()
        
        # Execute with empty prompt
        result = await service.send_message([], [])
        
        # Should still work
        mock_conversation.send_message_async.assert_called_once_with([])
        assert result == mock_response
