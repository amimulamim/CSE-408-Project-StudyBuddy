import pytest
from unittest.mock import Mock
from app.ai.baseChatService import BaseChatService, AIResponse


class TestAIResponse:
    """Test AIResponse data class"""
    
    def test_init_with_text_only(self):
        """Test creating AIResponse with text only"""
        response = AIResponse("Hello world")
        assert response.text == "Hello world"
        assert response.files == []
    
    def test_init_with_text_and_files(self):
        """Test creating AIResponse with text and files"""
        files = ["file1.pdf", "file2.txt"]
        response = AIResponse("Hello world", files)
        assert response.text == "Hello world"
        assert response.files == files
    
    def test_init_with_none_files(self):
        """Test creating AIResponse with None files"""
        response = AIResponse("Hello world", None)
        assert response.text == "Hello world"
        assert response.files == []


class TestBaseChatService:
    """Test BaseChatService abstract base class"""
    
    def test_abstract_class_cannot_be_instantiated(self):
        """Test that BaseChatService cannot be instantiated directly"""
        with pytest.raises(TypeError):
            BaseChatService()
    
    def test_subclass_must_implement_send_message(self):
        """Test that subclasses must implement send_message method"""
        class IncompleteService(BaseChatService):
            pass
        
        with pytest.raises(TypeError):
            IncompleteService()
    
    def test_valid_subclass_implementation(self):
        """Test that a proper subclass can be instantiated"""
        class ValidService(BaseChatService):
            def send_message(self, context, user_prompt):
                return AIResponse("test response")
        
        service = ValidService()
        response = service.send_message([], "test")
        assert isinstance(response, AIResponse)
        assert response.text == "test response"


class MockChatService(BaseChatService):
    """Mock implementation for testing"""
    
    def send_message(self, context, user_prompt):
        return AIResponse(f"Mock response to: {user_prompt}")


class TestBaseChatServiceIntegration:
    """Integration tests for BaseChatService"""
    
    @pytest.fixture
    def mock_service(self):
        return MockChatService()
    
    def test_polymorphic_behavior(self, mock_service):
        """Test that the service can be used polymorphically"""
        service: BaseChatService = mock_service
        response = service.send_message([], "Hello AI")
        assert response.text == "Mock response to: Hello AI"
    
    def test_context_parameter(self, mock_service):
        """Test that context parameter is properly passed"""
        context = [{"role": "user", "content": "Previous message"}]
        response = mock_service.send_message(context, "Follow up")
        assert isinstance(response, AIResponse)
