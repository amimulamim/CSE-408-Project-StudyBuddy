import pytest
from unittest.mock import Mock, patch
from app.ai.chatFactory import get_chat_llm
from app.ai.baseChatService import BaseChatService
from app.ai.geminiService import GeminiService


class TestChatFactory:
    """Test chat factory functionality"""
    
    def test_get_gemini_service(self):
        """Test getting Gemini service"""
        with patch('app.ai.chatFactory.GeminiService') as mock_gemini:
            mock_instance = Mock(spec=GeminiService)
            mock_gemini.return_value = mock_instance
            
            service = get_chat_llm("gemini")
            
            assert service == mock_instance
            mock_gemini.assert_called_once()
    
    def test_get_gemini_service_default(self):
        """Test getting service with default parameter"""
        with patch('app.ai.chatFactory.GeminiService') as mock_gemini:
            mock_instance = Mock(spec=GeminiService)
            mock_gemini.return_value = mock_instance
            
            service = get_chat_llm()  # Default should be "gemini"
            
            assert service == mock_instance
            mock_gemini.assert_called_once()
    
    def test_unsupported_model_raises_error(self):
        """Test that unsupported model raises ValueError"""
        with pytest.raises(ValueError) as exc_info:
            get_chat_llm("unsupported_model")
        
        assert "Unsupported model: unsupported_model" in str(exc_info.value)
    
    def test_empty_model_name_raises_error(self):
        """Test that empty model name raises ValueError"""
        with pytest.raises(ValueError) as exc_info:
            get_chat_llm("")
        
        assert "Unsupported model:" in str(exc_info.value)
    
    def test_none_model_name_raises_error(self):
        """Test that None model name raises ValueError"""
        with pytest.raises(ValueError) as exc_info:
            get_chat_llm(None)
        
        assert "Unsupported model: None" in str(exc_info.value)
    
    def test_returns_base_chat_service_instance(self):
        """Test that factory returns BaseChatService instance"""
        with patch('app.ai.chatFactory.GeminiService') as mock_gemini:
            mock_instance = Mock(spec=GeminiService)
            mock_gemini.return_value = mock_instance
            
            service = get_chat_llm("gemini")
            
            # Should be an instance of BaseChatService (through inheritance)
            assert hasattr(service, 'send_message')
    
    def test_case_sensitivity(self):
        """Test that model name is case sensitive"""
        with pytest.raises(ValueError) as exc_info:
            get_chat_llm("GEMINI")
        
        assert "Unsupported model: GEMINI" in str(exc_info.value)
        
        with pytest.raises(ValueError) as exc_info:
            get_chat_llm("Gemini")
        
        assert "Unsupported model: Gemini" in str(exc_info.value)
    
    def test_factory_pattern_extensibility(self):
        """Test that the factory pattern allows for easy extension"""
        # This test demonstrates how the factory could be extended
        # in the future for other models
        supported_models = ["gemini"]
        
        for model in supported_models:
            with patch('app.ai.chatFactory.GeminiService') as mock_service:
                mock_instance = Mock()
                mock_service.return_value = mock_instance
                
                service = get_chat_llm(model)
                assert service is not None
