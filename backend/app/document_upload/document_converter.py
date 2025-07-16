import io
import logging
from PyPDF2 import PdfReader
import re

logger = logging.getLogger(__name__)

class DocumentConverter:
    """Handles extraction of text from uploaded documents."""
    def __init__(self):
        # No initialization required for this service class
        pass

    def _clean_text(self, text: str) -> str:
        """Clean text by removing or replacing problematic Unicode characters."""
        if not text:
            return text
            
        try:
            # Remove or replace Unicode surrogate characters and other problematic characters
            # This handles emoji and other special Unicode characters that cause encoding issues
            text = text.encode('utf-8', errors='ignore').decode('utf-8')
            
            # Remove remaining surrogate characters using regex
            text = re.sub(r'[\ud800-\udfff]', '', text)
            
            # Replace common problematic characters
            text = text.replace('\ufffd', '')  # Remove replacement character
            
            # Normalize whitespace
            text = ' '.join(text.split())
            
            return text
        except Exception as e:
            logger.warning(f"Error cleaning text: {str(e)}")
            # Return original text if cleaning fails
            return text

    def _extract_pdf_text(self, content: bytes) -> str:
        """Extract text from PDF content."""
        pdf_file = io.BytesIO(content)
        pdf_reader = PdfReader(pdf_file)
        
        extracted_text = ""
        total_pages = len(pdf_reader.pages)
        
        for page_num, page in enumerate(pdf_reader.pages):
            try:
                page_text = page.extract_text() or ""
                extracted_text += page_text
            except Exception as e:
                logger.warning(f"Failed to extract text from page {page_num + 1}: {str(e)}")
                continue
        
        cleaned_text = self._clean_text(extracted_text)
        
        # Validate extracted text
        if not cleaned_text or len(cleaned_text.strip()) < 10:
            logger.warning(f"PDF appears to contain minimal text. Pages: {total_pages}, Text length: {len(cleaned_text.strip())}")
            if total_pages > 0:
                raise ValueError("This PDF appears to be image-based or contains no extractable text. Please try a text-based PDF or convert it to a searchable format.")
            else:
                raise ValueError("PDF file appears to be empty or corrupted.")
        
        logger.debug(f"Successfully extracted {len(cleaned_text)} characters from {total_pages} pages")
        return cleaned_text

    def _extract_plain_text(self, content: bytes) -> str:
        """Extract text from plain text content."""
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            # Try with different encodings if UTF-8 fails
            for encoding in ['latin1', 'cp1252', 'ascii']:
                try:
                    text = content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                # If all encodings fail, use utf-8 with error handling
                text = content.decode("utf-8", errors='ignore')
        
        cleaned_text = self._clean_text(text)
        if not cleaned_text or len(cleaned_text.strip()) < 1:
            raise ValueError("Text file appears to be empty or contains no readable content.")
        
        return cleaned_text

    def extract_text(self, content: bytes, file_type: str) -> str:
        """Extracts text from a document based on its file type."""
        try:
            if file_type == "application/pdf":
                return self._extract_pdf_text(content)
            elif file_type == "text/plain":
                return self._extract_plain_text(content)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
        except ValueError:
            # Re-raise ValueError with specific messages
            raise
        except Exception as e:
            logger.error(f"Error extracting text from document: {str(e)}")
            raise RuntimeError(f"Error extracting text: {str(e)}")