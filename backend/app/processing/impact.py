from typing import List
from app.models.event import Event
from app.models.impact import EventImpact

class ImpactAnalyzer:
    def analyze(self, events: List[Event]) -> None:
        """
        Calculates structured impact dimensions.
        """
        for event in events:
            text = (event.title or "") + " " + (event.summary or "")
            text = text.lower()
            
            # Very basic deterministic heuristics
            transport_impact = 0.0
            freight_impact = 0.0
            passenger_impact = 0.0
            infra_impact = 0.0
            
            if "highway" in text or "expressway" in text or "national highway" in text:
                transport_impact = 0.8
                freight_impact = 0.9
                passenger_impact = 0.7
                infra_impact = 0.5
                
            if "railway" in text or "train" in text:
                transport_impact = 0.8
                passenger_impact = 0.9
                if "freight" in text or "goods train" in text:
                    freight_impact = 0.9
                    
            if "airport" in text or "flight" in text:
                transport_impact = 0.7
                passenger_impact = 0.9
                if "cargo" in text:
                    freight_impact = 0.8
                    
            if "port" in text or "shipping" in text or "cargo" in text:
                transport_impact = 0.8
                freight_impact = 1.0
                passenger_impact = 0.2
                
            if "bridge collapse" in text or "landslide" in text or "damage" in text:
                infra_impact = 1.0
                
            impact = EventImpact(
                event_id=event.id,
                transport_impact_score=transport_impact,
                freight_impact_score=freight_impact,
                passenger_impact_score=passenger_impact,
                infrastructure_impact_score=infra_impact
            )
            
            if not hasattr(event, "impacts"):
                event.impacts = []
            event.impacts.append(impact)
