import logging
import time
from typing import List, Optional
from datetime import datetime
import httpx
import feedparser
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.ingestion.base import SourceAdapter, SourceHealth
from app.models.document import RawDocument
from app.core.enums import SourceHealthStatus

logger = logging.getLogger(__name__)

class PIBAdapter(SourceAdapter):
    name = "PIB"
    feed_urls = [
        "https://www.pib.gov.in/rss/Main.xml",
        "https://www.pib.gov.in/rss/Ministry.xml"
    ]

    def __init__(self, interval_minutes: int = 60):
        self.interval_minutes = interval_minutes

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException))
    )
    async def _fetch_feed(self, client: httpx.AsyncClient, url: str) -> str:
        response = await client.get(url, timeout=15.0)
        response.raise_for_status()
        return response.text

    def _parse_pub_date(self, date_string: str) -> Optional[datetime]:
        try:
            parsed = feedparser._parse_date(date_string)
            if parsed:
                return datetime.fromtimestamp(time.mktime(parsed))
        except Exception:
            pass
        return None

    def _normalize_entry(self, entry: dict) -> Optional[RawDocument]:
        url = entry.get("link")
        if not url:
            return None

        # Clean tracking params if any
        if "?" in url:
            url = url.split("?")[0]

        pub_date = self._parse_pub_date(entry.get("published", ""))
        
        return RawDocument(
            source_id="dummy", # Set by orchestrator
            original_url=entry.get("link"),
            canonical_url=url,
            original_title=entry.get("title", ""),
            raw_content=entry.get("summary", "") + "\n\n" + entry.get("description", ""),
            metadata_json={
                "author": entry.get("author", "PIB"),
                "guid": entry.get("id", url)
            },
            published_at=pub_date,
            fetched_at=datetime.utcnow()
        )

    async def fetch(self) -> List[RawDocument]:
        documents = []
        async with httpx.AsyncClient(follow_redirects=True) as client:
            for url in self.feed_urls:
                try:
                    xml_content = await self._fetch_feed(client, url)
                    feed = feedparser.parse(xml_content)
                    
                    if feed.bozo and hasattr(feed, 'bozo_exception'):
                        logger.warning(f"PIB Feed parsing issue (bozo) for {url}: {feed.bozo_exception}")
                        # feedparser often recovers enough to yield entries anyway
                        
                    for entry in feed.entries:
                        doc = self._normalize_entry(entry)
                        if doc:
                            documents.append(doc)
                except httpx.HTTPStatusError as e:
                    logger.error(f"HTTP error fetching PIB feed {url}: {e}")
                except Exception as e:
                    logger.error(f"Error processing PIB feed {url}: {e}")

        # Deduplicate
        unique_docs = {}
        for doc in documents:
            if doc.canonical_url not in unique_docs:
                unique_docs[doc.canonical_url] = doc

        return list(unique_docs.values())

    async def health_check(self) -> SourceHealth:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(self.feed_urls[0])
                if response.status_code == 200:
                    return SourceHealth(SourceHealthStatus.HEALTHY)
                return SourceHealth(SourceHealthStatus.DEGRADED, f"Status code: {response.status_code}")
        except Exception as e:
            return SourceHealth(SourceHealthStatus.FAILED, str(e))
