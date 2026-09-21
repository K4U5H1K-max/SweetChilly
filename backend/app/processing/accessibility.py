from typing import List, Dict, Any, Tuple
from app.models.event import Event
from app.models.impact import AccessibilityImpact

class AccessibilityAnalyzer:
    def __init__(self):
        # Positive infrastructure
        self.positive_keywords = ["wheelchair", "ramp", "lift", "elevator", "tactile", "low-floor", "accessible"]
        # Negative conditions / barriers
        self.barrier_keywords = ["failure", "broken", "blocked", "closure", "unavailable", "stairs-only"]
        
    def analyze(self, events: List[Event]) -> None:
        """
        Analyzes events for accessibility impacts and attaches AccessibilityImpact models.
        """
        for event in events:
            text = (event.title or "") + " " + (event.summary or "")
            text = text.lower()
            
            # Fast fail if no accessibility keywords
            if not any(kw in text for kw in self.positive_keywords + self.barrier_keywords):
                continue
                
            has_impact, details = self._evaluate(text)
            if has_impact:
                # We mutate the event in-memory to hold the impact record before DB insert
                impact = AccessibilityImpact(
                    event_id=event.id, # Will be set during flush if event is new
                    is_barrier=details["is_barrier"],
                    affected_infrastructure=details["affected_infra"],
                    description=details["description"]
                )
                
                # We need a way to attach this to the Event model before persistence.
                # Assuming Event model has relationship `accessibility_impacts`
                if not hasattr(event, "accessibility_impacts"):
                    event.accessibility_impacts = []
                event.accessibility_impacts.append(impact)

    def _evaluate(self, text: str) -> Tuple[bool, Dict[str, Any]]:
        is_barrier = False
        affected_infra = []
        
        for infra in ["lift", "elevator", "ramp", "wheelchair access", "tactile path"]:
            if infra in text:
                affected_infra.append(infra)
                
        # Proximity of barrier keyword to infra keyword indicates an issue
        # Simple heuristic: if both are present, assume barrier
        has_barrier_kw = any(kw in text for kw in self.barrier_keywords)
        has_infra_kw = len(affected_infra) > 0
        
        if has_barrier_kw and has_infra_kw:
            is_barrier = True
            
        # Also, generic environmental barriers for accessibility (flooded walkways)
        if "pedestrian" in text and ("flooded" in text or "blocked" in text):
            is_barrier = True
            affected_infra.append("pedestrian route")
            
        if affected_infra:
            desc = f"Accessibility {'barrier' if is_barrier else 'improvement'} affecting: {', '.join(affected_infra)}"
            return True, {"is_barrier": is_barrier, "affected_infra": affected_infra, "description": desc}
            
        return False, {}
