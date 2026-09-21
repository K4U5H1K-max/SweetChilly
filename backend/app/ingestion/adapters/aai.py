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

class AAIAdapter(SourceAdapter):
    name = "AAI"
    # AAI press releases
    base_url = "https://www.aai.aero/en/corporate/press-releases"

    def __init__(self, interval_minutes: int = 1440): 
        self.interval_minutes = interval_minutes

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException))
    )
    async def _fetch_html(self, client: httpx.AsyncClient, url: str) -> str:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = await client.get(url, headers=headers, timeout=20.0)
        response.raise_for_status()
        return response.text

    def _parse_html(self, html: str) -> List[RawDocument]:
        documents = []
        soup = BeautifulSoup(html, "html.parser")
        
        # Parse standard view rows in Drupal-based AAI site
        rows = soup.find_all('div', class_='views-row')
        for row in rows:
            title_div = row.find('div', class_='views-field-title')
            date_div = row.find('span', class_='date-display-single')
            
            if title_div:
                link_tag = title_div.find('a')
                if not link_tag:
                    continue
                    
                title = link_tag.get_text(strip=True)
                href = link_tag.get('href', '')
                url = href if href.startswith('http') else f"https://www.aai.aero{href}"
                
                date_str = date_div.get_text(strip=True) if date_div else ""
                pub_date = None
                if date_str:
                    try:
                        pub_date = datetime.strptime(date_str, "%d/%m/%Y - %H:%M")
                    except ValueError:
                        pub_date = datetime.utcnow()

                doc = RawDocument(
                    source_id="dummy",
                    original_url=url,
                    canonical_url=url,
                    original_title=title,
                    raw_content=title,
                    metadata_json={"publisher": "AAI"},
                    published_at=pub_date,
                    fetched_at=datetime.utcnow()
                )
                documents.append(doc)
                
        return documents

    async def fetch(self) -> List[RawDocument]:
        documents = []
        async with httpx.AsyncClient(verify=False) as client:
            try:
                html = await self._fetch_html(client, self.base_url)
                documents = self._parse_html(html)
            except Exception as e:
                logger.error(f"Error fetching AAI data: {e}")

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
