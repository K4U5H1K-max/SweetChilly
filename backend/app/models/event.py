from sqlalchemy import Column, String, Boolean, Float, DateTime, Text, Enum as SAEnum, ForeignKey, Integer
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from app.db.base import Base
from app.core.enums import EventStatus, EventSeverity
import uuid

class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=lambda: f"EVT-{uuid.uuid4().hex[:8].upper()}")
    event_type = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    summary = Column(Text)
    cause = Column(String, index=True)
    
    status = Column(SAEnum(EventStatus), default=EventStatus.DETECTED, index=True)
    severity = Column(SAEnum(EventSeverity), default=EventSeverity.UNKNOWN, index=True)
    severity_reasons = Column(JSONB)
    
    transport_modes = Column(ARRAY(String))
    affected_infrastructure = Column(ARRAY(String))
    affected_route = Column(String)
    direction = Column(String)
    
    accessibility_impact = Column(Boolean, default=False, index=True)
    accessibility_types = Column(ARRAY(String))
    
    event_start = Column(DateTime(timezone=True))
    event_end = Column(DateTime(timezone=True))
    expected_end = Column(DateTime(timezone=True))
    
    source_count = Column(Integer, default=1)
    confidence = Column(Float)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_updated = Column(DateTime(timezone=True))

class EventSource(Base):
    __tablename__ = "event_sources"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False)
    relationship_type = Column(String, default="EVIDENCE") # EVIDENCE, CONTRADICTION, UPDATE
    confidence = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class EventUpdate(Base):
    __tablename__ = "event_updates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False)
    document_id = Column(String, ForeignKey("documents.id", ondelete="SET NULL"), index=True)
    previous_status = Column(SAEnum(EventStatus))
    new_status = Column(SAEnum(EventStatus))
    update_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class EventLocation(Base):
    __tablename__ = "event_locations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False)
    location_id = Column(String, ForeignKey("locations.id", ondelete="CASCADE"), index=True, nullable=False)
    is_primary = Column(Boolean, default=True)

class DocumentLocation(Base):
    __tablename__ = "document_locations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False)
    location_id = Column(String, ForeignKey("locations.id", ondelete="CASCADE"), index=True, nullable=False)
