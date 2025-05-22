from abc import ABC, abstractmethod
from typing import List, Tuple

class BaseAI(ABC):
    @abstractmethod
    def chat(self, messages: List[Tuple[str, str]]) -> str:
        pass
