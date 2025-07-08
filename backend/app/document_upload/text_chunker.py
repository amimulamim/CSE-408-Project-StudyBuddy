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
                original_end = end
                
                # Try to find a word boundary, but don't go back too far
                while end > start and end < text_length and text[end] not in [' ', '\n', '.', '!', '?']:
                    end -= 1
                
                # If we couldn't find a boundary or went back too far, use the original end
                if end == start:
                    end = original_end
                
                chunks.append(text[start:end].strip())
                
                # Ensure we always make progress - start must advance by at least 1
                if end < text_length:
                    start = max(start + 1, end - self.overlap)
                else:
                    start = end
            
            return chunks
        except Exception as e:
            raise Exception(f"Error chunking text: {str(e)}")