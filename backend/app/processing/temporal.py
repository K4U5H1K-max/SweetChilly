import re
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import dateparser
from app.models.document import Document

class TemporalExtractor:
    def __init__(self):
        # Common phrases for start/end
        self.start_patterns = [
            re.compile(r'(?:starts?|begins?|effective from|from) (.*?)(?:\.|,|and|to|until)', re.IGNORECASE),
            re.compile(r'closure (?:starts|begins) (.*?)(?:\.|,|and|to|until)', re.IGNORECASE)
        ]
        self.end_patterns = [
            re.compile(r'(?:ends?|expected to end|until|to|cleared by) (.*?)(?:\.|,)', re.IGNORECASE),
            re.compile(r'closure (?:ends|expected to end) (.*?)(?:\.|,)', re.IGNORECASE)
        ]

    def extract(self, document: Document) -> Dict[str, Optional[datetime]]:
        """
        Extract temporal bounds of an event from the document text.
        """
        text = document.normalized_content or ""
        
        # Base times from document metadata
        # In a real pipeline, the raw_document's published_at would be passed or attached to Document
        # Since Document model doesn't store published_at directly right now, we assume it's passed or available.
        # We'll extract relative to current time if publication time isn't explicitly provided.
        now = datetime.now(timezone.utc)
        
        extracted_times = {
            "event_start": None,
            "event_end": None,
            "expected_end": None
        }
        
        if not text:
            return extracted_times

        # Extract Start Time
        for pattern in self.start_patterns:
            match = pattern.search(text)
            if match:
                date_str = match.group(1).strip()
                parsed = self._parse_date(date_str)
                if parsed:
                    extracted_times["event_start"] = parsed
                    break

        # Extract End Time
        for pattern in self.end_patterns:
            match = pattern.search(text)
            if match:
                date_str = match.group(1).strip()
                parsed = self._parse_date(date_str)
                if parsed:
                    if "expected" in match.group(0).lower():
                        extracted_times["expected_end"] = parsed
                    else:
                        extracted_times["event_end"] = parsed
                    break
                    
        return extracted_times

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        if len(date_str) < 3 or len(date_str) > 50:
            return None
            
        try:
            # dateparser is very flexible, but we want to avoid parsing random numbers as years
            settings = {'STRICT_PARSING': False, 'RETURN_AS_TIMEZONE_AWARE': True}
            parsed = dateparser.parse(date_str, settings=settings)
            return parsed
        except Exception:
            return None
