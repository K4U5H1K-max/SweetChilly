from abc import ABC, abstractmethod
from typing import List, Optional
from app.models.document import RawDocument
from app.core.enums import SourceHealthStatus

class SourceHealth:
    def __init__(self, status: SourceHealthStatus, message: Optional[str] = None):
        self.status = status
        self.message = message

class SourceAdapter(ABC):
    name: str

    @abstractmethod
    async def fetch(self) -> List[RawDocument]:
        """
        Fetch new documents from the source and return them as RawDocument models.
        The caller is responsible for persisting the documents.
        """
        pass

    @abstractmethod
    async def health_check(self) -> SourceHealth:
        """
        Check if the source is accessible and functioning correctly.
        """
        pass
