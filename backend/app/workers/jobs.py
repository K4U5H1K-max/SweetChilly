import asyncio
import logging
from rq import Queue
from redis import Redis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Create a Redis connection
redis_conn = Redis.from_url(settings.REDIS_URL)

# Create queues
ingestion_queue = Queue('ingestion', connection=redis_conn)
processing_queue = Queue('processing', connection=redis_conn)

def _run_async(coro):
    """Helper to run async code inside a synchronous RQ job worker."""
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(coro)

def run_source_ingestion(source_name: str):
    """
    Job that runs in the RQ worker to ingest a specific source.
    """
    logger.info(f"Job started: Ingest {source_name}")
    from app.services.orchestration import Orchestrator
    orchestrator = Orchestrator()
    try:
        _run_async(orchestrator.ingest_source(source_name))
        logger.info(f"Job completed: Ingest {source_name}")
    except Exception as e:
        logger.error(f"Job failed: Ingest {source_name} - {e}")
        raise

def run_pipeline():
    """
    Job that runs in the RQ worker to execute the processing pipeline.
    """
    logger.info("Job started: Process Pipeline")
    from app.services.orchestration import Orchestrator
    orchestrator = Orchestrator()
    try:
        _run_async(orchestrator.process_pipeline())
        logger.info("Job completed: Process Pipeline")
    except Exception as e:
        logger.error(f"Job failed: Process Pipeline - {e}")
        raise

def enqueue_ingestion_job(source_name: str):
    """
    Enqueues a job to ingest data from a specific source.
    """
    logger.info(f"Enqueueing ingestion for {source_name}")
    return ingestion_queue.enqueue(run_source_ingestion, source_name, job_timeout='10m')

def enqueue_processing_pipeline():
    """
    Enqueues the full processing pipeline.
    """
    logger.info("Enqueueing processing pipeline")
    return processing_queue.enqueue(run_pipeline, job_timeout='30m')
