import io
import logging
from PyPDF2 import PdfReader

logger = logging.getLogger(__name__)

class DocumentConverter:
    """Handles extraction of text from uploaded documents."""
    def __init__(self):
        pass

    def extract_text(self, content: bytes, file_type: str) -> str:
        """Extracts text from a document based on its file type."""
        try:
            if file_type == "application/pdf":
                pdf_file = io.BytesIO(content)
                pdf_reader = PdfReader(pdf_file)
                text = "".join(page.extract_text() or "" for page in pdf_reader.pages)
                return text
            elif file_type == "text/plain":
                return content.decode("utf-8")
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
        except Exception as e:
            logger.error(f"Error extracting text from document: {str(e)}")
            raise Exception(f"Error extracting text: {str(e)}")