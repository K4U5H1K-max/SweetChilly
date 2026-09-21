import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.ingestion.base import SourceAdapter, SourceHealth
from app.models.document import RawDocument
from app.core.enums import SourceHealthStatus

logger = logging.getLogger(__name__)

class IMDAdapter(SourceAdapter):
    name = "IMD"
    
    # IMD often changes API structure, these are typical endpoints
    endpoints = {
        "nowcast": "https://mausam.imd.gov.in/api/nowcast.php",
        "district_warning": "https://mausam.imd.gov.in/api/district_warning.php"
    }

    def __init__(self, interval_minutes: int = 60):
        self.interval_minutes = interval_minutes

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException))
    )
    async def _fetch_api(self, client: httpx.AsyncClient, url: str) -> Dict[str, Any]:
        response = await client.get(url, timeout=15.0)
        response.raise_for_status()
        
        # IMD sometimes returns JSON, sometimes text that looks like JSON
        try:
            return response.json()
        except ValueError:
            logger.warning(f"IMD returned invalid JSON for {url}. Attempting basic fix.")
            # Basic fallback for malformed JSON if strictly necessary, but better to fail cleanly
            raise ValueError(f"Invalid JSON from IMD endpoint {url}")

    def _normalize_nowcast(self, item: dict) -> Optional[RawDocument]:
        # Typical IMD nowcast structure
        station = item.get("station", "Unknown")
        warning = item.get("warning", "")
        if not warning:
            return None
            
        time_str = item.get("time_of_issue", "")
        pub_date = None
        if time_str:
            try:
                pub_date = datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                pub_date = datetime.utcnow()

        content = f"Nowcast for {station}: {warning}"
        url = f"imd://nowcast/{station.replace(' ', '_')}/{time_str.replace(' ', '_')}"
        
        return RawDocument(
            source_id="dummy",
            original_url=url,
            canonical_url=url,
            original_title=f"Weather Nowcast: {station}",
            raw_content=content,
            metadata_json=item,
            published_at=pub_date or datetime.utcnow(),
            fetched_at=datetime.utcnow()
        )

    def _normalize_warning(self, item: dict) -> Optional[RawDocument]:
        district = item.get("district", "Unknown")
        state = item.get("state", "Unknown")
        warning = item.get("severity", "") + " - " + item.get("description", "")
        
        date_str = item.get("date", "")
        url = f"imd://warning/{state.replace(' ', '_')}/{district.replace(' ', '_')}/{date_str}"
        
        pub_date = None
        if date_str:
            try:
                pub_date = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                pub_date = datetime.utcnow()

        return RawDocument(
            source_id="dummy",
            original_url=url,
            canonical_url=url,
            original_title=f"Weather Warning: {district}, {state}",
            raw_content=warning,
            metadata_json=item,
            published_at=pub_date or datetime.utcnow(),
            fetched_at=datetime.utcnow()
        )

    async def fetch(self) -> List[RawDocument]:
        documents = []
        async with httpx.AsyncClient() as client:
            # Fetch Nowcasts
            try:
                data = await self._fetch_api(client, self.endpoints["nowcast"])
                nowcasts = data.get("nowcast", [])
                if isinstance(nowcasts, list):
                    for item in nowcasts:
                        doc = self._normalize_nowcast(item)
                        if doc:
                            documents.append(doc)
            except Exception as e:
                logger.error(f"Failed to fetch IMD Nowcasts: {e}")

            # Fetch District Warnings
            try:
                data = await self._fetch_api(client, self.endpoints["district_warning"])
                warnings = data.get("warnings", [])
                if isinstance(warnings, list):
                    for item in warnings:
                        doc = self._normalize_warning(item)
                        if doc:
                            documents.append(doc)
            except Exception as e:
                logger.error(f"Failed to fetch IMD District Warnings: {e}")

        # Deduplicate internal
        unique_docs = {}
        for doc in documents:
            if doc.canonical_url not in unique_docs:
                unique_docs[doc.canonical_url] = doc

        return list(unique_docs.values())

    async def health_check(self) -> SourceHealth:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.head("https://mausam.imd.gov.in/")
                if response.status_code == 200:
                    return SourceHealth(SourceHealthStatus.HEALTHY)
                return SourceHealth(SourceHealthStatus.DEGRADED, f"Status code: {response.status_code}")
        except Exception as e:
            return SourceHealth(SourceHealthStatus.FAILED, str(e))
