import PyPDF2

class DocumentConverter:
    """Handles document ingestion and text extraction from PDF and text files."""
    
    def __init__(self):
        pass
    
    def extract_text(self, file_path: str) -> str:
        """Extracts text from PDF or .txt files."""
        try:
            if file_path.endswith('.pdf'):
                with open(file_path, 'rb') as file:
                    reader = PyPDF2.PdfReader(file)
                    text = ""
                    for page in reader.pages:
                        text += page.extract_text() or ""
                    return text.strip()
            elif file_path.endswith('.txt'):
                with open(file_path, 'r', encoding='utf-8') as file:
                    return file.read().strip()
            else:
                raise ValueError("Unsupported file format. Use .pdf or .txt")
        except Exception as e:
            raise Exception(f"Error extracting text from {file_path}: {str(e)}")