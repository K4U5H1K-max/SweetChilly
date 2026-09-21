import re
import unicodedata
from urllib.parse import urlparse, urlunparse
from typing import List, Optional
from bs4 import BeautifulSoup
from langdetect import detect, LangDetectException

from app.models.document import RawDocument, Document

class CleaningPipeline:
    def clean(self, raw_documents: List[RawDocument]) -> List[Document]:
        """
        Takes raw documents, normalizes Unicode, removes HTML/boilerplate,
        cleans up whitespace, detects language, and returns normalized Document objects.
        """
        cleaned = []
        for raw in raw_documents:
            # 1. URL Canonicalization
            canonical_url = self._canonicalize_url(raw.canonical_url or raw.original_url)
            
            # 2. Clean title and content
            clean_title = self._clean_text(raw.original_title)
            clean_content = self._clean_text(raw.raw_content)
            
            # 3. Language detection
            language = self._detect_language(clean_content) or self._detect_language(clean_title) or "unknown"
            
            # 4. Remove duplicate paragraphs
            clean_content = self._remove_duplicate_paragraphs(clean_content)

            doc = Document(
                raw_document_id=raw.id,
                normalized_title=clean_title,
                normalized_content=clean_content,
                is_relevant=None, # Will be set by RelevanceFilter
            )
            
            # Stash language in relevance_reasons temporarily or keep it tracked
            # We don't have a language field on Document model right now, so we can skip storing it 
            # if we don't strictly need it in DB, or add it to a JSON field.
            cleaned.append(doc)
            
        return cleaned

    def _clean_text(self, text: Optional[str]) -> str:
        if not text:
            return ""
            
        # Remove HTML
        soup = BeautifulSoup(text, "html.parser")
        text_no_html = soup.get_text(separator=" ")
        
        # Unicode normalization
        text_normalized = unicodedata.normalize("NFKC", text_no_html)
        
        # Whitespace normalization (replace multiple spaces/newlines with single)
        text_whitespace_clean = re.sub(r'\s+', ' ', text_normalized).strip()
        
        return text_whitespace_clean
        
    def _canonicalize_url(self, url: str) -> str:
        if not url:
            return ""
        parsed = urlparse(url)
        # Remove query parameters that are used for tracking
        # For simplicity, strip all query params for standard news URLs, 
        # but keep them if they might be ID params. We will strip UTM params specifically.
        query = parsed.query
        clean_query_parts = []
        for part in query.split("&"):
            if not part.startswith("utm_") and not part.startswith("fbclid"):
                if part:
                    clean_query_parts.append(part)
                    
        clean_query = "&".join(clean_query_parts)
        
        # Reconstruct
        # urlunparse expects (scheme, netloc, path, params, query, fragment)
        return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, clean_query, ''))

    def _detect_language(self, text: str) -> Optional[str]:
        if not text or len(text) < 10:
            return None
        try:
            return detect(text)
        except LangDetectException:
            return None

    def _remove_duplicate_paragraphs(self, text: str) -> str:
        paragraphs = text.split(". ")
        seen = set()
        unique_paras = []
        for p in paragraphs:
            p_clean = p.strip()
            if p_clean and p_clean not in seen:
                seen.add(p_clean)
                unique_paras.append(p_clean)
        return ". ".join(unique_paras)
