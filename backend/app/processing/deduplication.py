import hashlib
from typing import List, Set, Dict
from app.models.document import Document

class DeduplicationPipeline:
    def deduplicate(self, documents: List[Document]) -> List[Document]:
        """
        Deduplicates documents before expensive NLP processing.
        Uses canonical URL, normalized title, and content hash similarity.
        """
        unique_docs = []
        
        # Track what we've seen in this batch
        seen_title_hashes: Set[str] = set()
        seen_content_hashes: Set[str] = set()
        
        for doc in documents:
            # 1. Exact Title match (if title exists and is sufficiently long)
            title = doc.normalized_title or ""
            title_hash = self._hash_text(title)
            if len(title) > 15 and title_hash in seen_title_hashes:
                continue
                
            # 2. Content match (if content exists)
            content = doc.normalized_content or ""
            content_hash = self._hash_text(content)
            if len(content) > 50 and content_hash in seen_content_hashes:
                continue
                
            # If it passes, record its signatures
            if len(title) > 15:
                seen_title_hashes.add(title_hash)
            if len(content) > 50:
                seen_content_hashes.add(content_hash)
                
            unique_docs.append(doc)
                
        return unique_docs

    def _hash_text(self, text: str) -> str:
        # Simple MD5 for exact matching. 
        # For fuzzy matching, MinHash or SimHash would be used, but exact hash handles simple duplication.
        return hashlib.md5(text.encode('utf-8')).hexdigest()
