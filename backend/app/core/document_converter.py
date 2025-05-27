from PyPDF2 import PdfReader

class DocumentConverter:
    def convert_pdf(self, file_path: str) -> str:
        try:
            reader = PdfReader(file_path)
            text = "\n".join(page.extract_text() for page in reader.pages if page.extract_text())
            return text
        except Exception as e:
            raise ValueError(f"Failed to convert PDF: {e}")

    def convert_txt(self, file_path: str) -> str:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            raise ValueError(f"Failed to read TXT file: {e}")
        

