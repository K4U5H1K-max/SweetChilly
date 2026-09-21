import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal

from app.ingestion.adapters.gdelt import GDELTAdapter
from app.ingestion.adapters.pib import PIBAdapter
from app.ingestion.adapters.imd import IMDAdapter
from app.ingestion.adapters.nhai import NHAIAdapter
from app.ingestion.adapters.aai import AAIAdapter

from app.processing.cleaning import CleaningPipeline
from app.processing.deduplication import DeduplicationPipeline
from app.processing.filtering import RelevanceFilter
from app.processing.event_extraction import EventExtractor
from app.processing.accessibility import AccessibilityAnalyzer
from app.processing.impact import ImpactAnalyzer
from app.processing.severity import SeverityAnalyzer
from app.processing.clustering import EventClusteringPipeline
from app.events.lifecycle import EventLifecycleManager

from app.repositories import raw_document_repo, document_repo, event_repo, location_repo

logger = logging.getLogger(__name__)

class Orchestrator:
    def __init__(self):
        self.adapters = {
            "GDELT": GDELTAdapter(),
            "PIB": PIBAdapter(),
            "IMD": IMDAdapter(),
            "NHAI": NHAIAdapter(),
            "AAI": AAIAdapter()
        }
        self.cleaner = CleaningPipeline()
        self.deduper = DeduplicationPipeline()
        self.filter = RelevanceFilter()
        self.extractor = EventExtractor()
        self.accessibility = AccessibilityAnalyzer()
        self.impact = ImpactAnalyzer()
        self.severity = SeverityAnalyzer()
        self.clustering = EventClusteringPipeline()
        self.lifecycle = EventLifecycleManager()

    async def ingest_source(self, source_name: str):
        logger.info(f"Starting ingestion for {source_name}")
        adapter = self.adapters.get(source_name.upper())
        if not adapter:
            raise ValueError(f"Unknown source adapter: {source_name}")

        raw_docs = await adapter.fetch()
        logger.info(f"Fetched {len(raw_docs)} documents from {source_name}")

        with SessionLocal() as db:
            count = 0
            for raw_doc in raw_docs:
                # Fast deduplication check before insert
                existing = raw_document_repo.get_by_url(db, raw_doc.canonical_url)
                if not existing:
                    raw_document_repo.create(db, obj_in={
                        "source_id": "00000000-0000-0000-0000-000000000000", # Placeholder for actual Source UUID
                        "original_url": raw_doc.original_url,
                        "canonical_url": raw_doc.canonical_url,
                        "original_title": raw_doc.original_title,
                        "raw_content": raw_doc.raw_content,
                        "metadata_json": raw_doc.metadata_json,
                        "published_at": raw_doc.published_at,
                        "fetched_at": raw_doc.fetched_at
                    })
                    count += 1
            logger.info(f"Inserted {count} new raw documents from {source_name}")

    async def process_pipeline(self):
        logger.info("Starting processing pipeline")
        with SessionLocal() as db:
            # 1. Fetch unprocessed raw docs
            raw_docs = raw_document_repo.get_unprocessed(db, limit=500)
            if not raw_docs:
                logger.info("No new raw documents to process.")
                return

            # 2. Clean
            documents = self.cleaner.clean(raw_docs)
            
            # 3. Deduplicate
            unique_docs = self.deduper.deduplicate(documents)
            
            # 4. Filter
            relevant_docs = self.filter.filter(unique_docs)
            
            # Persist Document records
            persisted_docs = []
            for doc in relevant_docs:
                db_doc = document_repo.create(db, obj_in={
                    "raw_document_id": doc.raw_document_id,
                    "normalized_title": doc.normalized_title,
                    "normalized_content": doc.normalized_content,
                    "is_relevant": doc.is_relevant,
                    "relevance_score": doc.relevance_score,
                    "relevance_reasons": doc.relevance_reasons
                })
                doc.id = db_doc.id # Attach DB ID
                persisted_docs.append(doc)

            if not persisted_docs:
                logger.info("No relevant documents found in this batch.")
                return

            # 5. Extract Events
            events = await self.extractor.extract(persisted_docs)
            
            # 6. Analyze Impacts & Severity
            self.accessibility.analyze(events)
            self.impact.analyze(events)
            self.severity.analyze(events)
            
            # 7. Cluster with active events
            active_events = event_repo.get_active(db)
            canonical_events = self.clustering.cluster(events, active_events)
            
            # 8. Persist Events and Lifecycle
            for c_event in canonical_events:
                if getattr(c_event, "id", None) is None:
                    # New event
                    db_event = event_repo.create(db, obj_in={
                        "event_type": c_event.event_type,
                        "title": c_event.title,
                        "summary": c_event.summary,
                        "cause": c_event.cause,
                        "status": c_event.status,
                        "severity": c_event.severity,
                        "confidence": c_event.confidence,
                        "metadata_json": c_event.metadata_json
                    })
                    c_event.id = db_event.id
                    
                    # Persist impacts
                    if hasattr(c_event, "accessibility_impacts"):
                        from app.models.impact import AccessibilityImpact
                        for imp in c_event.accessibility_impacts:
                            imp_db = AccessibilityImpact(**imp.__dict__)
                            imp_db.event_id = db_event.id
                            db.add(imp_db)
                            
                    if hasattr(c_event, "impacts"):
                        from app.models.impact import EventImpact
                        for imp in c_event.impacts:
                            imp_db = EventImpact(**imp.__dict__)
                            imp_db.event_id = db_event.id
                            db.add(imp_db)
                            
                    db.commit()
                else:
                    # Update existing event
                    db_event = event_repo.get(db, c_event.id)
                    db_event.title = c_event.title
                    db_event.summary = c_event.summary
                    db_event.confidence = c_event.confidence
                    db_event.metadata_json = c_event.metadata_json
                    db.commit()
                    
                self.lifecycle.evaluate_status(db, c_event)
                
            logger.info(f"Processed batch. Created/updated {len(canonical_events)} events.")
