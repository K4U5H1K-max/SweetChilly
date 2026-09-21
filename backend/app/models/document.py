from sqlalchemy import Column, String, Boolean, Float, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base
import uuid

class RawDocument(Base):
    __tablename__ = "raw_documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String, index=True, nullable=False)
    external_id = Column(String, index=True)
    publisher = Column(String)
    original_url = Column(String, unique=True, index=True)
    canonical_url = Column(String, index=True)
    original_title = Column(String)
    original_description = Column(Text)
    raw_content = Column(Text)
    language = Column(String, default="en")
    source_metadata = Column(JSONB)
    source_published_at = Column(DateTime(timezone=True))
    retrieved_at = Column(DateTime(timezone=True), server_default=func.now())

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    raw_document_id = Column(String, unique=True, nullable=False)
    normalized_title = Column(String)
    normalized_content = Column(Text)
    
    # Relevance filtering
    is_relevant = Column(Boolean, default=False)
    relevance_score = Column(Float)
    relevance_reasons = Column(JSONB) # e.g. ["active_transport_disruption"]
    
    processed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
