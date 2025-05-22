from abc import ABC, abstractmethod
from typing import List, Optional

class AIResponse:
    def __init__(self, text: str, files: Optional[List[str]] = None):
        self.text = text
        self.files = files or []

class BaseChatService(ABC):
    @abstractmethod
    def send_message(self, context: List[dict], user_prompt: str) -> AIResponse:
        pass
