from typing import List, Protocol, Dict, Any, Optional
from datetime import datetime
from app.models.document import Document
from app.models.event import Event
from app.core.enums import EventStatus
from app.processing.ner import NERExtractor
from app.processing.temporal import TemporalExtractor
from app.processing.geolocation import GeolocationResolver

class EventExtractionProvider(Protocol):
    async def extract_event(self, document: Document) -> Event:
        pass

class EventExtractor:
    def __init__(self, provider: Optional[EventExtractionProvider] = None, use_llm: bool = False):
        self.provider = provider
        self.use_llm = use_llm
        self.ner = NERExtractor()
        self.temporal = TemporalExtractor()
        # Geolocation resolver requires a network call, we can instantiate it here or pass it in.
        self.geo = GeolocationResolver()

    async def extract(self, documents: List[Document]) -> List[Event]:
        """
        Extract canonical events from relevant documents.
        Uses deterministic logic first, falling back to LLM if enabled and necessary.
        """
        events = []
        for doc in documents:
            if not doc.is_relevant:
                continue
                
            event = await self._extract_deterministic(doc)
            
            if event.confidence < 0.7 and self.use_llm and self.provider:
                # LLM fallback for low confidence deterministic extraction
                try:
                    event = await self.provider.extract_event(doc)
                except Exception:
                    pass # Keep deterministic event on LLM failure
                
            events.append(event)
        return events
        
    async def _extract_deterministic(self, doc: Document) -> Event:
        text = (doc.normalized_title or "") + " " + (doc.normalized_content or "")
        
        # 1. NER
        entities = self.ner.extract(doc)
        
        # 2. Temporal
        times = self.temporal.extract(doc)
        
        # 3. Classify Type and Cause
        event_type, cause = self._classify_event_and_cause(text, entities)
        
        # 4. Resolve Location
        location_names = [e["normalized_value"] for e in entities if e["type"] == "LOCATION"]
        resolved_locations = self.geo.resolve(location_names)
        
        # Determine status
        status = EventStatus.ACTIVE
        if times.get("event_end") and times["event_end"] < datetime.utcnow():
            status = EventStatus.RESOLVED
            
        confidence = 0.5
        if event_type != "UNKNOWN": confidence += 0.2
        if resolved_locations: confidence += 0.2
        
        event = Event(
            event_type=event_type,
            title=doc.normalized_title or "Transportation Event",
            summary=doc.normalized_content[:500] if doc.normalized_content else "",
            cause=cause,
            status=status,
            confidence=min(1.0, confidence),
            metadata_json={
                "extracted_entities": entities,
                "temporal": times
            }
        )
        return event

    def _classify_event_and_cause(self, text: str, entities: List[Dict[str, Any]]) -> tuple[str, str]:
        text = text.lower()
        event_type = "UNKNOWN"
        cause = "UNKNOWN"
        
        # Event Type Logic
        if any(kw in text for kw in ["road close", "highway close", "road block"]):
            event_type = "ROAD_CLOSURE"
        elif any(kw in text for kw in ["train cancel", "railway close", "station close"]):
            event_type = "RAIL_DISRUPTION"
        elif any(kw in text for kw in ["flight cancel", "airport close", "runway close"]):
            event_type = "AIRPORT_DISRUPTION"
        elif any(kw in text for kw in ["port close", "shipping disrupt"]):
            event_type = "PORT_DISRUPTION"
        elif any(kw in text for kw in ["traffic", "congestion", "jam"]):
            event_type = "TRAFFIC_CONGESTION"
            
        # Cause Logic
        causes = [e["normalized_value"] for e in entities if e["type"] == "CAUSE"]
        weather = [e["normalized_value"] for e in entities if e["type"] == "WEATHER_CONDITION"]
        
        if causes:
            cause = causes[0]
        elif weather:
            cause = weather[0]
        elif "accident" in text or "crash" in text:
            cause = "ACCIDENT"
        elif "protest" in text or "strike" in text:
            cause = "PROTEST_STRIKE"
        elif "maintenance" in text or "repair" in text:
            cause = "MAINTENANCE"
            
        return event_type, cause
