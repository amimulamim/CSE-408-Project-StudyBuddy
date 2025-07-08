import pytest
import io
from unittest.mock import Mock, patch, mock_open
from PyPDF2 import PdfReader

from app.document_upload.document_converter import DocumentConverter


class TestDocumentConverter:
    """Test DocumentConverter class for text extraction from documents"""

    @pytest.fixture
    def document_converter(self):
        """Create DocumentConverter instance"""
        return DocumentConverter()

    def test_init_success(self, document_converter):
        """Test successful initialization of DocumentConverter"""
        assert document_converter is not None

    def test_extract_text_pdf_success(self, document_converter):
        """Test successful text extraction from PDF"""
        # Arrange
        mock_pdf_content = b"dummy pdf content"
        mock_page = Mock()
        mock_page.extract_text.return_value = "This is test text from PDF."
        
        with patch('app.document_upload.document_converter.PdfReader') as mock_pdf_reader:
            mock_reader_instance = Mock()
            mock_reader_instance.pages = [mock_page]
            mock_pdf_reader.return_value = mock_reader_instance
            
            # Act
            result = document_converter.extract_text(mock_pdf_content, "application/pdf")
            
            # Assert
            assert result == "This is test text from PDF."
            mock_pdf_reader.assert_called_once()

    def test_extract_text_pdf_multiple_pages(self, document_converter):
        """Test text extraction from PDF with multiple pages"""
        # Arrange
        mock_pdf_content = b"dummy pdf content"
        mock_page1 = Mock()
        mock_page1.extract_text.return_value = "Page 1 text. "
        mock_page2 = Mock()
        mock_page2.extract_text.return_value = "Page 2 text."
        
        with patch('app.document_upload.document_converter.PdfReader') as mock_pdf_reader:
            mock_reader_instance = Mock()
            mock_reader_instance.pages = [mock_page1, mock_page2]
            mock_pdf_reader.return_value = mock_reader_instance
            
            # Act
            result = document_converter.extract_text(mock_pdf_content, "application/pdf")
            
            # Assert
            assert result == "Page 1 text. Page 2 text."

    def test_extract_text_pdf_empty_page(self, document_converter):
        """Test text extraction from PDF with empty page"""
        # Arrange
        mock_pdf_content = b"dummy pdf content"
        mock_page1 = Mock()
        mock_page1.extract_text.return_value = "Valid text. "
        mock_page2 = Mock()
        mock_page2.extract_text.return_value = None  # Empty page
        
        with patch('app.document_upload.document_converter.PdfReader') as mock_pdf_reader:
            mock_reader_instance = Mock()
            mock_reader_instance.pages = [mock_page1, mock_page2]
            mock_pdf_reader.return_value = mock_reader_instance
            
            # Act
            result = document_converter.extract_text(mock_pdf_content, "application/pdf")
            
            # Assert
            assert result == "Valid text. "

    def test_extract_text_pdf_all_empty_pages(self, document_converter):
        """Test text extraction from PDF with all empty pages"""
        # Arrange
        mock_pdf_content = b"dummy pdf content"
        mock_page1 = Mock()
        mock_page1.extract_text.return_value = None
        mock_page2 = Mock()
        mock_page2.extract_text.return_value = ""
        
        with patch('app.document_upload.document_converter.PdfReader') as mock_pdf_reader:
            mock_reader_instance = Mock()
            mock_reader_instance.pages = [mock_page1, mock_page2]
            mock_pdf_reader.return_value = mock_reader_instance
            
            # Act
            result = document_converter.extract_text(mock_pdf_content, "application/pdf")
            
            # Assert
            assert result == ""

    def test_extract_text_text_plain_success(self, document_converter):
        """Test successful text extraction from plain text"""
        # Arrange
        text_content = "This is plain text content.".encode("utf-8")
        
        # Act
        result = document_converter.extract_text(text_content, "text/plain")
        
        # Assert
        assert result == "This is plain text content."

    def test_extract_text_text_plain_unicode(self, document_converter):
        """Test text extraction from plain text with unicode characters"""
        # Arrange
        text_content = "Unicode text: 你好世界 🌍".encode("utf-8")
        
        # Act
        result = document_converter.extract_text(text_content, "text/plain")
        
        # Assert
        assert result == "Unicode text: 你好世界 🌍"

    def test_extract_text_text_plain_empty(self, document_converter):
        """Test text extraction from empty plain text"""
        # Arrange
        text_content = b""
        
        # Act
        result = document_converter.extract_text(text_content, "text/plain")
        
        # Assert
        assert result == ""

    def test_extract_text_unsupported_file_type(self, document_converter):
        """Test extraction with unsupported file type"""
        # Arrange
        content = b"some content"
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            document_converter.extract_text(content, "application/msword")
        assert "Error extracting text: Unsupported file type: application/msword" in str(exc_info.value)

    def test_extract_text_pdf_reader_exception(self, document_converter):
        """Test PDF extraction with PdfReader exception"""
        # Arrange
        mock_pdf_content = b"corrupted pdf content"
        
        with patch('app.document_upload.document_converter.PdfReader') as mock_pdf_reader:
            mock_pdf_reader.side_effect = Exception("Corrupted PDF file")
            
            # Act & Assert
            with pytest.raises(Exception) as exc_info:
                document_converter.extract_text(mock_pdf_content, "application/pdf")
            assert "Error extracting text: Corrupted PDF file" in str(exc_info.value)

    def test_extract_text_plain_text_decode_exception(self, document_converter):
        """Test plain text extraction with decode exception"""
        # Arrange
        # Create invalid UTF-8 bytes
        invalid_utf8_content = b'\xff\xfe\x00\x00'
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            document_converter.extract_text(invalid_utf8_content, "text/plain")
        assert "Error extracting text:" in str(exc_info.value)

    def test_extract_text_pdf_io_exception(self, document_converter):
        """Test PDF extraction with IO exception"""
        # Arrange
        mock_pdf_content = b"dummy pdf content"
        
        with patch('app.document_upload.document_converter.io.BytesIO') as mock_bytesio:
            mock_bytesio.side_effect = Exception("IO Error")
            
            # Act & Assert
            with pytest.raises(Exception) as exc_info:
                document_converter.extract_text(mock_pdf_content, "application/pdf")
            assert "Error extracting text: IO Error" in str(exc_info.value)

    def test_extract_text_pdf_no_pages(self, document_converter):
        """Test PDF extraction with no pages"""
        # Arrange
        mock_pdf_content = b"dummy pdf content"
        
        with patch('app.document_upload.document_converter.PdfReader') as mock_pdf_reader:
            mock_reader_instance = Mock()
            mock_reader_instance.pages = []  # No pages
            mock_pdf_reader.return_value = mock_reader_instance
            
            # Act
            result = document_converter.extract_text(mock_pdf_content, "application/pdf")
            
            # Assert
            assert result == ""

    @patch('app.document_upload.document_converter.logger')
    def test_extract_text_logs_error(self, mock_logger, document_converter):
        """Test that errors are properly logged"""
        # Arrange
        content = b"some content"
        
        # Act & Assert
        with pytest.raises(Exception):
            document_converter.extract_text(content, "application/unsupported")
        
        mock_logger.error.assert_called_once()
        error_message = mock_logger.error.call_args[0][0]
        assert "Error extracting text from document:" in error_message

    def test_extract_text_case_sensitivity(self, document_converter):
        """Test file type case sensitivity"""
        # Arrange
        text_content = "Test content".encode("utf-8")
        
        # Act & Assert - Should handle case differences
        with pytest.raises(Exception) as exc_info:
            document_converter.extract_text(text_content, "TEXT/PLAIN")
        assert "Error extracting text: Unsupported file type: TEXT/PLAIN" in str(exc_info.value)
        
        with pytest.raises(Exception) as exc_info:
            document_converter.extract_text(text_content, "Application/PDF")
        assert "Error extracting text: Unsupported file type: Application/PDF" in str(exc_info.value)
