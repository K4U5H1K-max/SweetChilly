import logging
from typing import List, Optional
from datetime import datetime
import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.ingestion.base import SourceAdapter, SourceHealth
from app.models.document import RawDocument
from app.core.enums import SourceHealthStatus

logger = logging.getLogger(__name__)

class NHAIAdapter(SourceAdapter):
    name = "NHAI"
    # Typically NHAI posts press releases or updates here
    base_url = "https://nhai.gov.in/nhai/press-release"

    def __init__(self, interval_minutes: int = 1440): # Run daily by default as it's less frequent
        self.interval_minutes = interval_minutes

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException))
    )
    async def _fetch_html(self, client: httpx.AsyncClient, url: str) -> str:
        # NHAI site often requires a standard user agent
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = await client.get(url, headers=headers, timeout=20.0)
        response.raise_for_status()
        return response.text

    def _parse_html(self, html: str) -> List[RawDocument]:
        documents = []
        soup = BeautifulSoup(html, "html.parser")
        
        # This is a generic parser for a standard table/list based on typical gov sites
        # NHAI typically uses a table with class 'views-table' or standard rows
        table = soup.find('table')
        if not table:
            return documents
            
        rows = table.find_all('tr')
        for row in rows[1:]: # Skip header
            cols = row.find_all('td')
            if len(cols) >= 3:
                date_str = cols[0].get_text(strip=True)
                title = cols[1].get_text(strip=True)
                link_tag = cols[1].find('a')
                
                url = self.base_url
                if link_tag and 'href' in link_tag.attrs:
                    href = link_tag['href']
                    if href.startswith('http'):
                        url = href
                    else:
                        url = f"https://nhai.gov.in{href}"
                        
                pub_date = None
                try:
                    pub_date = datetime.strptime(date_str, "%d %b %Y")
                except ValueError:
                    pub_date = datetime.utcnow()

                doc = RawDocument(
                    source_id="dummy",
                    original_url=url,
                    canonical_url=url,
                    original_title=title,
                    raw_content=title, # Full content would require following the link, keeping simple for now
                    metadata_json={"publisher": "NHAI"},
                    published_at=pub_date,
                    fetched_at=datetime.utcnow()
                )
                documents.append(doc)
                
        return documents

    async def fetch(self) -> List[RawDocument]:
        documents = []
        async with httpx.AsyncClient(verify=False) as client: # Gov sites often have SSL issues
            try:
                html = await self._fetch_html(client, self.base_url)
                documents = self._parse_html(html)
            except Exception as e:
                logger.error(f"Error fetching NHAI data: {e}")

        # Deduplicate
        unique_docs = {}
        for doc in documents:
            if doc.canonical_url not in unique_docs:
                unique_docs[doc.canonical_url] = doc

        return list(unique_docs.values())

    async def health_check(self) -> SourceHealth:
        try:
            async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
                response = await client.head(self.base_url)
                if response.status_code == 200:
                    return SourceHealth(SourceHealthStatus.HEALTHY)
                return SourceHealth(SourceHealthStatus.DEGRADED, f"Status code: {response.status_code}")
        except Exception as e:
            return SourceHealth(SourceHealthStatus.FAILED, str(e))
