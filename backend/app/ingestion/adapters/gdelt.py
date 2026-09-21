import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import urllib.parse
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.ingestion.base import SourceAdapter, SourceHealth
from app.models.document import RawDocument
from app.core.enums import SourceHealthStatus
from app.core.config import settings

logger = logging.getLogger(__name__)

class GDELTAdapter(SourceAdapter):
    name = "GDELT"
    base_url = "https://api.gdeltproject.org/api/v2/doc/doc"
    
    # We construct queries based on configuration or hardcoded topics for now
    # The user requested: "road closures, highway disruption, traffic diversion, etc."
    topics = [
        "road closure OR highway disruption OR traffic diversion",
        "bridge closure OR railway disruption OR train cancellation",
        "airport disruption OR runway closure",
        "port congestion OR shipping disruption",
        "bus disruption OR metro disruption",
        "flooding OR cyclone OR landslide OR extreme rainfall",
        "wheelchair accessibility OR accessible transport"
    ]

    def __init__(self, interval_minutes: int = 15):
        self.interval_minutes = interval_minutes

    def _build_queries(self) -> List[str]:
        # GDELT requires query string parameters
        queries = []
        for topic in self.topics:
            # We want English news from the last interval_minutes
            # GDELT timespan format is like "15min", "24h"
            query_str = f'({topic}) sourcelang:eng'
            params = {
                "query": query_str,
                "mode": "artlist",
                "maxrecords": "250",
                "format": "json",
                "sort": "DateDesc",
                "timespan": f"{self.interval_minutes}min"
            }
            queries.append(f"{self.base_url}?{urllib.parse.urlencode(params)}")
        return queries

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException))
    )
    async def _execute_request(self, client: httpx.AsyncClient, url: str) -> Dict[str, Any]:
        response = await client.get(url, timeout=15.0)
        response.raise_for_status()
        return response.json()

    def _parse_gdelt_date(self, seendate: str) -> Optional[datetime]:
        # GDELT format: 20240508T123000Z
        try:
            return datetime.strptime(seendate, "%Y%m%dT%H%M%SZ")
        except ValueError:
            return None

    def _normalize_article(self, article: dict) -> Optional[RawDocument]:
        url = article.get("url")
        if not url:
            return None

        # Determine timestamp
        published_at = self._parse_gdelt_date(article.get("seendate", ""))
        
        # Deduplication identifier for GDELT is typically the URL.
        # Sometimes GDELT returns a mobile URL and desktop URL, but URL is the best we have.
        
        return RawDocument(
            source_id="dummy", # Will be set by the orchestrator based on the actual Source record
            original_url=url,
            canonical_url=url,
            original_title=article.get("title", ""),
            raw_content=article.get("title", "") + " - " + article.get("url", ""), # GDELT artlist only provides title/URL snippet
            metadata_json={
                "domain": article.get("domain"),
                "language": article.get("language"),
                "sourcecountry": article.get("sourcecountry")
            },
            published_at=published_at,
            fetched_at=datetime.utcnow()
        )

    async def fetch(self) -> List[RawDocument]:
        """
        Fetch data from GDELT using the configured topics.
        """
        import asyncio
        urls = self._build_queries()
        documents = []
        
        async with httpx.AsyncClient() as client:
            for url in urls:
                try:
                    data = await self._execute_request(client, url)
                    articles = data.get("articles", [])
                    for art in articles:
                        doc = self._normalize_article(art)
                        if doc:
                            documents.append(doc)
                except httpx.HTTPStatusError as e:
                    # GDELT returns 400 when there are no records found sometimes, or just empty articles
                    if e.response.status_code != 400:
                        logger.error(f"HTTP error fetching GDELT URL {url}: {e}")
                except Exception as e:
                    logger.error(f"Error fetching GDELT URL {url}: {e}")
                
                # Sleep to respect GDELT's strict rate limits (429 Too Many Requests)
                await asyncio.sleep(5)

        # Deduplicate internally before returning
        unique_docs = {}
        for doc in documents:
            if doc.original_url not in unique_docs:
                unique_docs[doc.original_url] = doc

        return list(unique_docs.values())

    async def health_check(self) -> SourceHealth:
        try:
            # Simple health check querying something innocuous
            test_url = f"{self.base_url}?query=test&mode=artlist&format=json&maxrecords=1"
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(test_url)
                if response.status_code in [200, 400]: # 400 often means no data, but API is up
                    return SourceHealth(SourceHealthStatus.HEALTHY)
                return SourceHealth(SourceHealthStatus.DEGRADED, f"Status code: {response.status_code}")
        except Exception as e:
            return SourceHealth(SourceHealthStatus.FAILED, str(e))
