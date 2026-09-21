from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.db.base import Base
import uuid

class EventImpact(Base):
    __tablename__ = "event_impacts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False)
    impact_type = Column(String, index=True) # e.g. TRANSPORT, FREIGHT, PASSENGER, GEOGRAPHIC_SCOPE
    description = Column(Text)
    severity_level = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AccessibilityImpact(Base):
    __tablename__ = "accessibility_impacts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False)
    accessibility_type = Column(String, index=True) # e.g. WHEELCHAIR_ACCESS, LIFT_FAILURE
    description = Column(Text)
    confidence = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
