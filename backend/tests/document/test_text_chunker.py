import pytest
from typing import List

from app.document_upload.text_chunker import TextChunker


class TestTextChunker:
    """Test TextChunker class for text splitting with configurable chunk size and overlap"""

    @pytest.fixture
    def text_chunker(self):
        """Create TextChunker instance with default parameters"""
        return TextChunker()

    def test_init_default_parameters(self, text_chunker):
        """Test initialization with default parameters"""
        assert text_chunker.chunk_size == 1000
        assert text_chunker.overlap == 200

    def test_chunk_text_simple_case(self, text_chunker):
        """Test chunking with simple text case"""
        # Arrange
        text = "This is a simple test text that should be chunked properly."
        
        # Act
        chunks = text_chunker.chunk_text(text)
        
        # Assert
        assert len(chunks) == 1  # Text is shorter than chunk_size
        assert chunks[0] == text

    def test_chunk_text_longer_than_chunk_size(self):
        """Test chunking with text longer than chunk size"""
        # Arrange
        chunker = TextChunker(chunk_size=10, overlap=3)
        text = "This is a long text that needs to be chunked into smaller pieces."
        
        # Act
        chunks = chunker.chunk_text(text)
        
        # Assert
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk) <= 10 or chunk == chunks[-1]  # Last chunk can be shorter

    def test_chunk_text_empty_string(self, text_chunker):
        """Test chunking empty string"""
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            text_chunker.chunk_text("")
        assert "Error chunking text: Input text is empty" in str(exc_info.value)

    def test_chunk_text_unicode_characters(self):
        """Test chunking with unicode characters"""
        # Arrange
        chunker = TextChunker(chunk_size=20, overlap=5)
        text = "Unicode test: 你好世界 🌍 café naïve résumé"
        
        # Act
        chunks = chunker.chunk_text(text)
        
        # Assert
        assert len(chunks) >= 1
        for chunk in chunks:
            assert chunk == chunk.strip()
