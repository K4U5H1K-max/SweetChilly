import spacy
from spacy.pipeline import EntityRuler
import spacy.cli
from typing import List, Dict, Any
from app.models.document import Document

class NERExtractor:
    def __init__(self, model_name: str = "en_core_web_sm"):
        try:
            self.nlp = spacy.load(model_name)
        except OSError:
            # Fallback for dev environments without the model downloaded
            spacy.cli.download(model_name)
            self.nlp = spacy.load(model_name)
            
        # Add an EntityRuler for domain-specific patterns before the NER component
        self._setup_domain_ruler()

    def _setup_domain_ruler(self):
        ruler = self.nlp.add_pipe("entity_ruler", before="ner", config={"overwrite_ents": True})
        
        patterns = [
            # Infrastructure
            {"label": "HIGHWAY", "pattern": [{"LOWER": "nh"}, {"IS_DIGIT": True}]},
            {"label": "HIGHWAY", "pattern": [{"LOWER": "national"}, {"LOWER": "highway"}, {"IS_DIGIT": True}]},
            {"label": "HIGHWAY", "pattern": [{"LOWER": "expressway"}]},
            {"label": "BRIDGE", "pattern": [{"LOWER": {"REGEX": ".*bridge$"}}]},
            {"label": "TUNNEL", "pattern": [{"LOWER": {"REGEX": ".*tunnel$"}}]},
            
            # Transport Modes
            {"label": "STATION", "pattern": [{"LOWER": {"REGEX": ".*station$"}}]},
            {"label": "AIRPORT", "pattern": [{"LOWER": {"REGEX": ".*airport$"}}]},
            {"label": "PORT", "pattern": [{"LOWER": {"REGEX": ".*port$"}}]},
            
            # Weather & Causes
            {"label": "WEATHER_CONDITION", "pattern": [{"LOWER": "heavy"}, {"LOWER": "rain"}]},
            {"label": "WEATHER_CONDITION", "pattern": [{"LOWER": "heavy"}, {"LOWER": "rainfall"}]},
            {"label": "WEATHER_CONDITION", "pattern": [{"LOWER": "landslide"}]},
            {"label": "WEATHER_CONDITION", "pattern": [{"LOWER": "cyclone"}]},
            {"label": "WEATHER_CONDITION", "pattern": [{"LOWER": "flood"}]},
            {"label": "WEATHER_CONDITION", "pattern": [{"LOWER": "waterlogging"}]},
            
            # Disruption Types
            {"label": "CAUSE", "pattern": [{"LOWER": "accident"}]},
            {"label": "CAUSE", "pattern": [{"LOWER": "collision"}]},
            {"label": "CAUSE", "pattern": [{"LOWER": "derailment"}]},
            {"label": "CAUSE", "pattern": [{"LOWER": "protest"}]},
            {"label": "CAUSE", "pattern": [{"LOWER": "strike"}]},
            
            # Agencies
            {"label": "GOVERNMENT_AGENCY", "pattern": [{"LOWER": "nhai"}]},
            {"label": "GOVERNMENT_AGENCY", "pattern": [{"LOWER": "aai"}]},
            {"label": "GOVERNMENT_AGENCY", "pattern": [{"LOWER": "imd"}]},
            {"label": "GOVERNMENT_AGENCY", "pattern": [{"LOWER": "ndrf"}]}
        ]
        ruler.add_patterns(patterns)

    def extract(self, document: Document) -> List[Dict[str, Any]]:
        """
        Extracts domain-specific entities (locations, organizations, infrastructure).
        Returns a list of entity dictionaries containing text, label, and confidence.
        """
        text = document.normalized_content or ""
        if not text:
            return []
            
        doc = self.nlp(text)
        extracted = []
        
        for ent in doc.ents:
            # Map general spaCy labels to our domain if needed
            label = ent.label_
            if label == "GPE":
                label = "LOCATION"
            elif label == "ORG" and "railway" in ent.text.lower():
                label = "TRANSPORT_OPERATOR"
                
            # Confidence is hard for rule-based, assign high confidence to rules, lower to stat model
            confidence = 0.9 if ent.label_ in ["HIGHWAY", "BRIDGE", "WEATHER_CONDITION", "CAUSE", "GOVERNMENT_AGENCY"] else 0.7
            
            extracted.append({
                "text": ent.text,
                "type": label,
                "normalized_value": ent.text.strip().upper(),
                "confidence": confidence,
                "source_span": [ent.start_char, ent.end_char]
            })
            
        return extracted
