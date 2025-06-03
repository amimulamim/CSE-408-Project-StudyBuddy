import pytest
import io
from unittest.mock import Mock, patch, MagicMock
import requests
from app.chat.utils.geminiFormatter import (
    fetch_file_bytes,
    _process_pdf_data,
    prepare_gemini_parts,
    TEXT_EXTENSIONS,
    MAX_PDF_PAGES_AS_IMAGES,
    INCLUDE_PDF_TEXT_CONTENT,
    INCLUDE_PDF_PAGE_IMAGES
)


class TestGeminiFormatter:
    """Test geminiFormatter utility functions"""

    def test_text_extensions_constant(self):
        """Test that TEXT_EXTENSIONS contains expected file types"""
        assert ".txt" in TEXT_EXTENSIONS
        assert ".py" in TEXT_EXTENSIONS
        assert ".js" in TEXT_EXTENSIONS
        assert ".json" in TEXT_EXTENSIONS
        assert ".md" in TEXT_EXTENSIONS

    def test_configuration_constants(self):
        """Test configuration constants are properly set"""
        assert MAX_PDF_PAGES_AS_IMAGES == 50
        assert INCLUDE_PDF_TEXT_CONTENT is True
        assert INCLUDE_PDF_PAGE_IMAGES is True

    @patch('app.chat.utils.geminiFormatter.requests.get')
    def test_fetch_file_bytes_success(self, mock_get):
        """Test successful file fetching"""
        mock_response = Mock()
        mock_response.content = b"test file content"
        mock_get.return_value = mock_response

        result = fetch_file_bytes("https://example.com/file.txt")
        
        assert result == b"test file content"
        mock_get.assert_called_once_with("https://example.com/file.txt")
        mock_response.raise_for_status.assert_called_once()

    @patch('app.chat.utils.geminiFormatter.requests.get')
    def test_fetch_file_bytes_http_error(self, mock_get):
        """Test file fetching with HTTP error"""
        mock_response = Mock()
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError("404 Not Found")
        mock_get.return_value = mock_response

        with pytest.raises(requests.exceptions.HTTPError):
            fetch_file_bytes("https://example.com/nonexistent.txt")

    @patch('app.chat.utils.geminiFormatter.fitz')
    def test_process_pdf_data_success_with_text_and_images(self, mock_fitz):
        """Test successful PDF processing with text and images"""
        # Setup mock PDF document
        mock_doc = Mock()
        mock_page1 = Mock()
        mock_page1.get_text.return_value = "Page 1 content"
        mock_page2 = Mock()
        mock_page2.get_text.return_value = "Page 2 content"

        mock_pixmap1 = Mock()
        mock_pixmap1.tobytes.return_value = b"image1_data"
        mock_pixmap2 = Mock()
        mock_pixmap2.tobytes.return_value = b"image2_data"

        mock_page1.get_pixmap.return_value = mock_pixmap1
        mock_page2.get_pixmap.return_value = mock_pixmap2

        # Properly mock __len__ method
        mock_doc.__len__ = Mock(return_value=2)
        mock_doc.load_page.side_effect = [mock_page1, mock_page2, mock_page1, mock_page2]
        mock_fitz.open.return_value = mock_doc

        pdf_bytes = b"fake pdf content"
        pdf_url = "https://example.com/test.pdf"

        result = _process_pdf_data(pdf_bytes, pdf_url)

        # Verify the result structure (1 text part + 2 image parts + 2 image description parts)
        assert len(result) == 5
        
        # Check text content part
        text_part = result[0]
        assert "text" in text_part
        assert "Page 1 content" in text_part["text"]
        assert "Page 2 content" in text_part["text"]
        assert pdf_url in text_part["text"]
        
        # Check image parts
        image_parts = [part for part in result if "inline_data" in part]
        assert len(image_parts) == 2
        assert image_parts[0]["inline_data"]["mime_type"] == "image/png"
        assert image_parts[0]["inline_data"]["data"] == b"image1_data"

        # Check image description parts
        description_parts = [part for part in result if "text" in part and "Image of Page" in part["text"]]
        assert len(description_parts) == 2

        # Verify PDF was opened correctly
        mock_fitz.open.assert_called_once_with(stream=pdf_bytes, filetype="pdf")
        mock_doc.close.assert_called_once()

    @patch('app.chat.utils.geminiFormatter.fitz')
    def test_process_pdf_data_no_text_content(self, mock_fitz):
        """Test PDF processing when no text content is extracted"""
        mock_doc = Mock()
        mock_page = Mock()
        mock_page.get_text.return_value = "   "  # Only whitespace
        
        mock_pixmap = Mock()
        mock_pixmap.tobytes.return_value = b"image_data"
        mock_page.get_pixmap.return_value = mock_pixmap
        
        mock_doc.__len__ = Mock(return_value=1)
        mock_doc.load_page.side_effect = [mock_page, mock_page]
        mock_fitz.open.return_value = mock_doc

        result = _process_pdf_data(b"pdf", "test.pdf")

        # Should have "no text content" message plus image parts
        text_parts = [part for part in result if "text" in part and "No text content extracted" in part["text"]]
        assert len(text_parts) == 1
        
        # Should also have image parts
        image_parts = [part for part in result if "inline_data" in part]
        assert len(image_parts) == 1
        
        mock_doc.close.assert_called_once()

    @patch('app.chat.utils.geminiFormatter.fitz')
    def test_process_pdf_data_processing_error(self, mock_fitz):
        """Test PDF processing with error"""
        mock_fitz.open.side_effect = Exception("PDF processing error")

        result = _process_pdf_data(b"invalid pdf", "test.pdf")

        assert len(result) == 1
        assert "Error processing PDF" in result[0]["text"]
        assert "PDF processing error" in result[0]["text"]

    @patch('app.chat.utils.geminiFormatter.fitz')
    def test_process_pdf_data_text_disabled(self, mock_fitz):
        """Test PDF processing with text extraction disabled"""
        with patch('app.chat.utils.geminiFormatter.INCLUDE_PDF_TEXT_CONTENT', False):
            with patch('app.chat.utils.geminiFormatter.INCLUDE_PDF_PAGE_IMAGES', False):
                mock_doc = Mock()
                mock_doc.__len__ = Mock(return_value=1)
                mock_fitz.open.return_value = mock_doc

                result = _process_pdf_data(b"pdf", "test.pdf")

                # Should be empty since both text and images are disabled
                assert len(result) == 0
                mock_doc.close.assert_called_once()

    @patch('app.chat.utils.geminiFormatter.fetch_file_bytes')
    @patch('app.chat.utils.geminiFormatter.mimetypes.guess_type')
    def test_prepare_gemini_parts_text_only(self, mock_guess_type, mock_fetch):
        """Test preparing parts with text only"""
        result = prepare_gemini_parts("Hello world", [])
        
        assert len(result) == 1
        assert result[0]["text"] == "Hello world"

    @patch('app.chat.utils.geminiFormatter.fetch_file_bytes')
    @patch('app.chat.utils.geminiFormatter.mimetypes.guess_type')
    def test_prepare_gemini_parts_image_file(self, mock_guess_type, mock_fetch):
        """Test preparing parts with image file"""
        mock_guess_type.return_value = ("image/jpeg", None)
        mock_fetch.return_value = b"fake image data"

        result = prepare_gemini_parts("Check this image", ["https://example.com/image.jpg"])
        
        assert len(result) == 2
        assert result[0]["text"] == "Check this image"
        assert result[1]["inline_data"]["mime_type"] == "image/jpeg"
        assert result[1]["inline_data"]["data"] == b"fake image data"

    @patch('app.chat.utils.geminiFormatter.fetch_file_bytes')
    @patch('app.chat.utils.geminiFormatter.mimetypes.guess_type')
    def test_prepare_gemini_parts_text_file(self, mock_guess_type, mock_fetch):
        """Test preparing parts with text file"""
        mock_guess_type.return_value = ("text/plain", None)
        mock_fetch.return_value = b"This is file content"

        result = prepare_gemini_parts("", ["https://example.com/file.txt"])
        
        assert len(result) == 1
        assert "Content from file: https://example.com/file.txt" in result[0]["text"]
        assert "This is file content" in result[0]["text"]

    @patch('app.chat.utils.geminiFormatter.fetch_file_bytes')
    @patch('app.chat.utils.geminiFormatter.mimetypes.guess_type')
    def test_prepare_gemini_parts_text_extension_file(self, mock_guess_type, mock_fetch):
        """Test preparing parts with file having text extension"""
        mock_guess_type.return_value = (None, None)  # No mime type detected
        mock_fetch.return_value = b"print('Hello world')"

        result = prepare_gemini_parts("", ["https://example.com/script.py"])
        
        assert len(result) == 1
        assert "Content from file:" in result[0]["text"]
        assert "print('Hello world')" in result[0]["text"]

    @patch('app.chat.utils.geminiFormatter.fetch_file_bytes')
    @patch('app.chat.utils.geminiFormatter._process_pdf_data')
    @patch('app.chat.utils.geminiFormatter.mimetypes.guess_type')
    def test_prepare_gemini_parts_pdf_file(self, mock_guess_type, mock_process_pdf, mock_fetch):
        """Test preparing parts with PDF file"""
        mock_guess_type.return_value = ("application/pdf", None)
        mock_fetch.return_value = b"fake pdf data"
        mock_process_pdf.return_value = [
            {"text": "PDF content"},
            {"inline_data": {"mime_type": "image/png", "data": b"pdf_image"}}
        ]

        result = prepare_gemini_parts("", ["https://example.com/document.pdf"])
        
        assert len(result) == 2
        assert result[0]["text"] == "PDF content"
        assert result[1]["inline_data"]["mime_type"] == "image/png"
        mock_process_pdf.assert_called_once_with(b"fake pdf data", "https://example.com/document.pdf")

    @patch('app.chat.utils.geminiFormatter.fetch_file_bytes')
    @patch('app.chat.utils.geminiFormatter.mimetypes.guess_type')
    def test_prepare_gemini_parts_unsupported_file(self, mock_guess_type, mock_fetch):
        """Test preparing parts with unsupported file type"""
        mock_guess_type.return_value = ("application/x-binary", None)
        mock_fetch.return_value = b"binary data"

        result = prepare_gemini_parts("", ["https://example.com/file.bin"])
        
        assert len(result) == 1
        assert "Unsupported file type" in result[0]["text"]
        assert "application/x-binary" in result[0]["text"]

    @patch('app.chat.utils.geminiFormatter.fetch_file_bytes')
    @patch('app.chat.utils.geminiFormatter.mimetypes.guess_type')
    def test_prepare_gemini_parts_fetch_error(self, mock_guess_type, mock_fetch):
        """Test preparing parts with file fetch error"""
        mock_guess_type.return_value = ("text/plain", None)
        mock_fetch.side_effect = requests.exceptions.RequestException("Network error")

        result = prepare_gemini_parts("", ["https://example.com/file.txt"])
        
        assert len(result) == 1
        assert "Failed to fetch file" in result[0]["text"]
        assert "Network error" in result[0]["text"]

    @patch('app.chat.utils.geminiFormatter.fetch_file_bytes')
    @patch('app.chat.utils.geminiFormatter.mimetypes.guess_type')
    def test_prepare_gemini_parts_unicode_decode_error(self, mock_guess_type, mock_fetch):
        """Test preparing parts with Unicode decode error"""
        mock_guess_type.return_value = ("text/plain", None)
        mock_fetch.return_value = b'\x80\x81\x82'  # Invalid UTF-8

        result = prepare_gemini_parts("", ["https://example.com/file.txt"])
        
        assert len(result) == 1
        assert "non-UTF-8 or binary" in result[0]["text"]

    @patch('app.chat.utils.geminiFormatter.fetch_file_bytes')
    @patch('app.chat.utils.geminiFormatter.mimetypes.guess_type')
    def test_prepare_gemini_parts_general_exception(self, mock_guess_type, mock_fetch):
        """Test preparing parts with general exception"""
        mock_guess_type.return_value = ("text/plain", None)
        mock_fetch.side_effect = Exception("Unexpected error")

        result = prepare_gemini_parts("", ["https://example.com/file.txt"])
        
        assert len(result) == 1
        assert "An unexpected error occurred" in result[0]["text"]
        assert "Unexpected error" in result[0]["text"]

    @patch('app.chat.utils.geminiFormatter.fetch_file_bytes')
    @patch('app.chat.utils.geminiFormatter.mimetypes.guess_type')
    def test_prepare_gemini_parts_url_parsing_error(self, mock_guess_type, mock_fetch):
        """Test preparing parts with URL parsing error"""
        mock_guess_type.return_value = ("text/plain", None)
        mock_fetch.return_value = b"content"

        # URL without proper structure
        result = prepare_gemini_parts("", ["invalid-url"])
        
        assert len(result) == 1
        # Should still process the file even with parsing issues

    @patch('app.chat.utils.geminiFormatter.fetch_file_bytes')
    @patch('app.chat.utils.geminiFormatter.mimetypes.guess_type')
    def test_prepare_gemini_parts_multiple_files(self, mock_guess_type, mock_fetch):
        """Test preparing parts with multiple files"""
        mock_guess_type.side_effect = [("image/png", None), ("text/plain", None)]
        mock_fetch.side_effect = [b"image data", b"text content"]

        urls = ["https://example.com/image.png", "https://example.com/file.txt"]
        result = prepare_gemini_parts("Process these files", urls)
        
        assert len(result) == 3  # 1 text + 1 image + 1 text file
        assert result[0]["text"] == "Process these files"
        assert "inline_data" in result[1]
        assert "Content from file:" in result[2]["text"]

    def test_prepare_gemini_parts_empty_input(self):
        """Test preparing parts with empty input"""
        result = prepare_gemini_parts("", [])
        
        assert len(result) == 0

    def test_prepare_gemini_parts_none_text(self):
        """Test preparing parts with None text"""
        result = prepare_gemini_parts(None, [])
        
        assert len(result) == 0
