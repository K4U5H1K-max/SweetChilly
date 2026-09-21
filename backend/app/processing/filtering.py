from typing import List, Tuple
from app.models.document import Document

class RelevanceFilter:
    def __init__(self, threshold: float = 1.0):
        self.threshold = threshold
        
        # High-signal positive keywords for logistics, transport, accessibility
        self.positive_keywords = {
            # Infrastructure
            "highway": 1.0, "expressway": 1.0, "road": 0.5, "bridge": 1.0, "tunnel": 1.0, "flyover": 0.8,
            "railway": 1.0, "train": 0.8, "metro": 1.0, "station": 0.5, "track": 0.5,
            "airport": 1.0, "runway": 1.0, "terminal": 0.5, "flight": 0.5,
            "port": 1.0, "cargo": 0.8, "logistics": 1.0, "freight": 1.0, "shipping": 0.8,
            
            # Events / Disruptions
            "closure": 1.5, "closed": 1.0, "blocked": 1.0, "blockade": 1.5, "barricade": 1.0,
            "accident": 1.0, "collision": 1.0, "crash": 1.0, "pileup": 1.5,
            "derailment": 2.0, "cancelled": 0.5, "cancellation": 0.8, "delayed": 0.3,
            "diversion": 1.5, "diverted": 1.0, "rerouted": 1.0,
            "congestion": 0.8, "traffic jam": 1.0, "gridlock": 1.5,
            "strike": 1.0, "protest": 0.5,
            
            # Weather impacts
            "flooded": 1.0, "flooding": 1.0, "waterlogging": 1.5, "landslide": 2.0, "avalanche": 2.0,
            "cyclone": 1.0, "hurricane": 1.0, "heavy rainfall": 0.5, "fog": 0.5, "visibility": 0.5,
            
            # Accessibility
            "wheelchair": 1.5, "accessible": 0.8, "ramp": 0.8, "elevator": 0.5, "lift": 0.3,
            "tactile": 1.0, "disabled": 0.5, "disability": 0.5, "barrier-free": 1.5
        }
        
        # Negative signals to downrank irrelevant topics
        self.negative_keywords = {
            "celebrity": -2.0, "bollywood": -2.0, "hollywood": -2.0, "actor": -1.0, "actress": -1.0,
            "cricket": -2.0, "football": -1.0, "sports": -1.0, "tournament": -1.0,
            "gossip": -2.0, "entertainment": -1.5, "movie": -1.0, "film": -1.0,
            "marketing": -1.0, "advertising": -1.0, "sale": -1.0, "discount": -1.0,
            "election": -0.5, "poll": -0.5, "political rally": -0.5 # But protest might block roads
        }

    def filter(self, documents: List[Document]) -> List[Document]:
        """
        Evaluate documents for relevance to logistics, infrastructure, and accessibility.
        Sets is_relevant, relevance_score, and relevance_reasons on the Document.
        Returns a list of documents that passed the threshold.
        """
        relevant_docs = []
        for doc in documents:
            score, reasons = self._evaluate(doc)
            doc.relevance_score = score
            doc.relevance_reasons = reasons
            
            if score >= self.threshold:
                doc.is_relevant = True
                relevant_docs.append(doc)
            else:
                doc.is_relevant = False
                
        return relevant_docs

    def _evaluate(self, doc: Document) -> Tuple[float, List[str]]:
        text = (doc.normalized_title or "") + " " + (doc.normalized_content or "")
        text = text.lower()
        
        score = 0.0
        reasons = []
        
        # Check positive keywords
        for kw, weight in self.positive_keywords.items():
            if kw in text:
                score += weight
                reasons.append(f"pos:{kw}")
                
        # Check negative keywords
        for kw, weight in self.negative_keywords.items():
            if kw in text:
                score += weight
                reasons.append(f"neg:{kw}")
                
        # Cap score between 0 and 10 for sanity
        score = max(0.0, min(score, 10.0))
        return score, reasons
