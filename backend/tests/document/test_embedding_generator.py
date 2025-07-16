import pytest
from unittest.mock import Mock, patch

from app.document_upload.embedding_generator import EmbeddingGenerator


class TestEmbeddingGenerator:
    """Test EmbeddingGenerator class for generating text embeddings"""

    def test_init_success(self):
        """Test successful initialization of EmbeddingGenerator"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            
            # Act
            generator = EmbeddingGenerator()
            
            # Assert
            assert generator.api_key == "test-api-key"
            assert generator.model_name == "models/embedding-001"
            assert generator.task_type == "RETRIEVAL_DOCUMENT"
            mock_genai.configure.assert_called_once_with(api_key="test-api-key")

    def test_init_custom_parameters(self):
        """Test initialization with custom parameters"""
        with patch('app.document_upload.embedding_generator.genai'), \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            
            # Act
            generator = EmbeddingGenerator(
                model_name="models/custom-embedding",
                task_type="CUSTOM_TASK"
            )
            
            # Assert
            assert generator.model_name == "models/custom-embedding"
            assert generator.task_type == "CUSTOM_TASK"

    def test_init_missing_api_key(self):
        """Test initialization failure with missing API key"""
        with patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = None
            
            # Act & Assert
            with pytest.raises(ValueError) as exc_info:
                EmbeddingGenerator()
            assert "Missing GEMINI_API_KEY in environment." in str(exc_info.value)

    def test_init_empty_api_key(self):
        """Test initialization failure with empty API key"""
        with patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = ""
            
            # Act & Assert
            with pytest.raises(ValueError) as exc_info:
                EmbeddingGenerator()
            assert "Missing GEMINI_API_KEY in environment." in str(exc_info.value)

    def test_init_genai_configure_exception(self):
        """Test initialization failure with genai.configure exception"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            mock_genai.configure.side_effect = Exception("API configuration error")
            
            # Act & Assert
            with pytest.raises(Exception) as exc_info:
                EmbeddingGenerator()
            assert "API configuration error" in str(exc_info.value)

    def test_get_embedding_success(self):
        """Test successful embedding generation"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            mock_response = {"embedding": [0.1, 0.2, 0.3, 0.4, 0.5]}
            mock_genai.embed_content.return_value = mock_response
            
            generator = EmbeddingGenerator()
            
            # Act
            result = generator.get_embedding("test text")
            
            # Assert
            assert result == [0.1, 0.2, 0.3, 0.4, 0.5]
            mock_genai.embed_content.assert_called_once_with(
                model="models/embedding-001",
                content="test text",
                task_type="RETRIEVAL_DOCUMENT"
            )

    def test_get_embedding_custom_model(self):
        """Test embedding generation with custom model"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            mock_response = {"embedding": [0.1, 0.2, 0.3]}
            mock_genai.embed_content.return_value = mock_response
            
            generator = EmbeddingGenerator(
                model_name="models/custom-embedding",
                task_type="CUSTOM_TASK"
            )
            
            # Act
            result = generator.get_embedding("custom text")
            
            # Assert
            assert result == [0.1, 0.2, 0.3]
            mock_genai.embed_content.assert_called_once_with(
                model="models/custom-embedding",
                content="custom text",
                task_type="CUSTOM_TASK"
            )

    def test_get_embedding_empty_text(self):
        """Test embedding generation with empty text"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            mock_response = {"embedding": [0.0, 0.0, 0.0]}
            mock_genai.embed_content.return_value = mock_response
            
            generator = EmbeddingGenerator()
            
            # Act & Assert - should raise RuntimeError for empty text
            with pytest.raises(RuntimeError, match="Gemini embedding failed: Text is empty after sanitization"):
                generator.get_embedding("")

    def test_get_embedding_unicode_text(self):
        """Test embedding generation with unicode text"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            mock_response = {"embedding": [0.1, 0.2, 0.3]}
            mock_genai.embed_content.return_value = mock_response
            
            generator = EmbeddingGenerator()
            unicode_text = "Unicode: 你好世界 🌍"
            
            # Act
            result = generator.get_embedding(unicode_text)
            
            # Assert
            assert result == [0.1, 0.2, 0.3]

    def test_get_embedding_no_embedding_in_response(self):
        """Test embedding generation when response has no embedding"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            mock_response = {"status": "success"}  # No embedding key
            mock_genai.embed_content.return_value = mock_response
            
            generator = EmbeddingGenerator()
            
            # Act & Assert
            with pytest.raises(RuntimeError) as exc_info:
                generator.get_embedding("test text")
            assert "Gemini embedding failed: Invalid embedding response from Gemini API" in str(exc_info.value)

    def test_get_embedding_null_embedding(self):
        """Test embedding generation when embedding is null"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            mock_response = {"embedding": None}
            mock_genai.embed_content.return_value = mock_response
            
            generator = EmbeddingGenerator()
            
            # Act & Assert
            with pytest.raises(RuntimeError) as exc_info:
                generator.get_embedding("test text")
            assert "Gemini embedding failed: Invalid embedding response from Gemini API" in str(exc_info.value)

    def test_get_embedding_empty_embedding(self):
        """Test embedding generation when embedding is empty list"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            mock_response = {"embedding": []}
            mock_genai.embed_content.return_value = mock_response
            
            generator = EmbeddingGenerator()
            
            # Act & Assert
            with pytest.raises(RuntimeError) as exc_info:
                generator.get_embedding("test text")
            assert "Gemini embedding failed: Invalid embedding response from Gemini API" in str(exc_info.value)

    def test_get_embedding_invalid_embedding_type(self):
        """Test embedding generation when embedding is not a list"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            mock_response = {"embedding": "not a list"}
            mock_genai.embed_content.return_value = mock_response
            
            generator = EmbeddingGenerator()
            
            # Act & Assert
            with pytest.raises(RuntimeError) as exc_info:
                generator.get_embedding("test text")
            assert "Gemini embedding failed: Invalid embedding response from Gemini API" in str(exc_info.value)

    def test_get_embedding_api_exception(self):
        """Test embedding generation with API exception"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            mock_genai.embed_content.side_effect = Exception("API Error")
            
            generator = EmbeddingGenerator()
            
            # Act & Assert
            with pytest.raises(RuntimeError) as exc_info:
                generator.get_embedding("test text")
            assert "Gemini embedding failed: API Error" in str(exc_info.value)

    def test_get_embedding_api_timeout(self):
        """Test embedding generation with API timeout"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            mock_genai.embed_content.side_effect = TimeoutError("Request timeout")
            
            generator = EmbeddingGenerator()
            
            # Act & Assert
            with pytest.raises(RuntimeError) as exc_info:
                generator.get_embedding("test text")
            assert "Gemini embedding failed: Request timeout" in str(exc_info.value)

    def test_get_embedding_network_error(self):
        """Test embedding generation with network error"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            mock_genai.embed_content.side_effect = ConnectionError("Network error")
            
            generator = EmbeddingGenerator()
            
            # Act & Assert
            with pytest.raises(RuntimeError) as exc_info:
                generator.get_embedding("test text")
            assert "Gemini embedding failed: Network error" in str(exc_info.value)

    def test_get_embedding_malformed_response(self):
        """Test embedding generation with malformed response"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            mock_genai.embed_content.return_value = None  # No response
            
            generator = EmbeddingGenerator()
            
            # Act & Assert
            with pytest.raises(RuntimeError) as exc_info:
                generator.get_embedding("test text")
            assert "Gemini embedding failed:" in str(exc_info.value)

    def test_get_embedding_response_with_extra_fields(self):
        """Test embedding generation with response containing extra fields"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            mock_response = {
                "embedding": [0.1, 0.2, 0.3],
                "model": "models/embedding-001",
                "usage": {"input_tokens": 10},
                "extra_field": "extra_value"
            }
            mock_genai.embed_content.return_value = mock_response
            
            generator = EmbeddingGenerator()
            
            # Act
            result = generator.get_embedding("test text")
            
            # Assert
            assert result == [0.1, 0.2, 0.3]  # Should extract only the embedding

    def test_get_embedding_numeric_precision(self):
        """Test embedding generation with high precision numbers"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            high_precision_embedding = [0.123456789012345, -0.987654321098765, 0.0]
            mock_response = {"embedding": high_precision_embedding}
            mock_genai.embed_content.return_value = mock_response
            
            generator = EmbeddingGenerator()
            
            # Act
            result = generator.get_embedding("test text")
            
            # Assert
            assert result == high_precision_embedding
            assert isinstance(result[0], float)
            assert isinstance(result[1], float)

    def test_get_embedding_large_dimension(self):
        """Test embedding generation with large dimension embedding"""
        with patch('app.document_upload.embedding_generator.genai') as mock_genai, \
             patch('app.document_upload.embedding_generator.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-api-key"
            large_embedding = [0.1] * 1536  # Common large embedding dimension
            mock_response = {"embedding": large_embedding}
            mock_genai.embed_content.return_value = mock_response
            
            generator = EmbeddingGenerator()
            
            # Act
            result = generator.get_embedding("test text")
            
            # Assert
            assert len(result) == 1536
            assert all(abs(val - 0.1) < 1e-6 for val in result)
