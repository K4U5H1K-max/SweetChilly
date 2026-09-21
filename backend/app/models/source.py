from sqlalchemy import Column, String, Boolean, Integer, DateTime, Enum as SAEnum
from sqlalchemy.sql import func
from app.db.base import Base
from app.core.enums import SourceReliability, SourceHealthStatus, RunStatus
import uuid

class Source(Base):
    __tablename__ = "sources"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    enabled = Column(Boolean, default=True)
    reliability = Column(SAEnum(SourceReliability), default=SourceReliability.OTHER)
    health_status = Column(SAEnum(SourceHealthStatus), default=SourceHealthStatus.UNKNOWN)
    interval_minutes = Column(Integer, default=60)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class SourceRun(Base):
    __tablename__ = "source_runs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String, index=True, nullable=False)
    status = Column(SAEnum(RunStatus), default=RunStatus.RUNNING)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True))
    documents_fetched = Column(Integer, default=0)
    documents_inserted = Column(Integer, default=0)
    documents_rejected = Column(Integer, default=0)
    error_message = Column(String)
    duration_seconds = Column(Integer)
