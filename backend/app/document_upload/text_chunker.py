from typing import List

class TextChunker:
    """Handles text splitting with configurable chunk size and overlap."""
    
    def __init__(self, chunk_size: int = 1000, overlap: int = 200):
        self.chunk_size = chunk_size
        self.overlap = overlap
    
    def chunk_text(self, text: str) -> List[str]:
        """Splits text into chunks with specified size and overlap."""
        try:
            if not text:
                raise ValueError("Input text is empty")
            
            chunks = []
            start = 0
            text_length = len(text)
            
            while start < text_length:
                end = min(start + self.chunk_size, text_length)
                while end < text_length and text[end] not in [' ', '\n', '.', '!', '?']:
                    end -= 1
                if end == start:
                    end = min(start + self.chunk_size, text_length)
                
                chunks.append(text[start:end].strip())
                start = end - self.overlap if end < text_length else end
            
            return chunks
        except Exception as e:
            raise Exception(f"Error chunking text: {str(e)}")