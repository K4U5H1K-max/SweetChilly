# Scraper & Processing Guide

This backend is designed to run asynchronously using Redis and RQ workers. However, for development, testing, or environments without a worker, you can run the ingestion and processing pipelines **sequentially** (synchronously) directly from the command line.

## 1. Sequential Ingestion

Instead of enqueuing jobs to Redis, you can run the source ingestion directly in your current terminal session by calling the orchestrator.

*(Note: We can add a synchronous flag to the CLI in the future, but currently, you can run it via a simple python one-liner or a custom script.)*

To run ingestion synchronously, open a python shell or create a script:

```python
import asyncio
from app.services.orchestration import Orchestrator

async def run_ingestion():
    orchestrator = Orchestrator()
    # To ingest a specific source (e.g., GDELT, PIB, IMD, NHAI, AAI)
    await orchestrator.ingest_source("GDELT")
    
    # Or iterate over all enabled sources manually
    # for source in ["GDELT", "PIB", "IMD", "NHAI", "AAI"]:
    #     await orchestrator.ingest_source(source)

asyncio.run(run_ingestion())
```

## 2. Sequential Processing

Once the raw documents are ingested into the database, you can run the NLP processing, deduplication, and event extraction synchronously:

```python
import asyncio
from app.services.orchestration import Orchestrator

async def run_processing():
    orchestrator = Orchestrator()
    await orchestrator.process_pipeline()

asyncio.run(run_processing())
```

## 3. End-to-End Sequential Run

If you want to do everything in one go without starting a Redis worker, run:

```python
import asyncio
from app.services.orchestration import Orchestrator

async def run_all():
    orchestrator = Orchestrator()
    print("Ingesting data...")
    await orchestrator.ingest_source("GDELT")  # replace with your target source
    print("Processing pipeline...")
    await orchestrator.process_pipeline()
    print("Done!")

asyncio.run(run_all())
```

## Troubleshooting API Limitations

As seen in the recent worker logs, external scrapers often face rate limits and blocking:
- **GDELT**: Can return `429 Too Many Requests`.
- **PIB/IMD/NHAI/AAI**: Will often return `404 Not Found` or `403 Forbidden` if their site structures change or if they aggressively block automated requests from local IPs.

Running the scraper sequentially allows you to immediately see these HTTP errors in your terminal, making it much easier to debug or swap out proxies using the `httpx` adapters located in `app/ingestion/adapters/`.
