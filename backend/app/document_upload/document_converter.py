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

    def extract_text(self, content: bytes, file_type: str) -> str:
        """Extracts text from a document based on its file type."""
        try:
            if file_type == "application/pdf":
                pdf_file = io.BytesIO(content)
                pdf_reader = PdfReader(pdf_file)
                text = "".join(page.extract_text() or "" for page in pdf_reader.pages)
                return self._clean_text(text)
            elif file_type == "text/plain":
                # Use error handling for decoding to handle malformed UTF-8
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
                return self._clean_text(text)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
        except Exception as e:
            logger.error(f"Error extracting text from document: {str(e)}")
            raise RuntimeError(f"Error extracting text: {str(e)}")