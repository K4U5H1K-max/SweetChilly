from typing import List
from app.models.event import Event

class SeverityAnalyzer:
    def analyze(self, events: List[Event]) -> None:
        """
        Assigns transparent rule-based severity calculation.
        """
        for event in events:
            severity_score = 0
            reasons = []
            
            text = (event.title or "") + " " + (event.summary or "")
            text = text.lower()
            
            # Evidence-based factors
            if event.event_type == "ROAD_CLOSURE" and "active" in str(event.status).lower():
                severity_score += 3
                reasons.append("ACTIVE_CLOSURE")
                
            if "highway" in text or "expressway" in text or "national highway" in text:
                severity_score += 3
                reasons.append("MAJOR_CORRIDOR")
                
            if event.event_type == "AIRPORT_DISRUPTION" and "close" in text:
                severity_score += 5
                reasons.append("AIRPORT_CLOSURE")
                
            if event.event_type == "RAIL_DISRUPTION" and ("shutdown" in text or "derailment" in text):
                severity_score += 5
                reasons.append("RAILWAY_SHUTDOWN")
                
            if "multiple routes" in text or "widespread" in text:
                severity_score += 2
                reasons.append("MULTIPLE_ROUTES_AFFECTED")
                
            if event.event_type == "ROAD_CLOSURE" and "bridge" in text:
                severity_score += 4
                reasons.append("BRIDGE_CLOSURE")
                
            if "freight" in text or "cargo" in text or "goods train" in text:
                severity_score += 2
                reasons.append("FREIGHT_CORRIDOR_AFFECTED")
                
            if hasattr(event, 'accessibility_impacts') and any(imp.is_barrier for imp in event.accessibility_impacts):
                severity_score += 2
                reasons.append("ACCESSIBILITY_BARRIER")

            # Determine ordinal severity based on score
            severity_level = "LOW"
            if severity_score >= 8:
                severity_level = "CRITICAL"
            elif severity_score >= 5:
                severity_level = "HIGH"
            elif severity_score >= 3:
                severity_level = "MODERATE"
                
            # If no reasons were matched but it's an event, it's at least LOW
            if not reasons:
                reasons.append("DEFAULT_MINOR_EVENT")
                
            event.severity = severity_level
            
            if event.metadata_json is None:
                event.metadata_json = {}
            event.metadata_json["severity_score"] = severity_score
            event.metadata_json["severity_reasons"] = reasons
