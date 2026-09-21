from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.event import Event, EventSource, EventUpdate, EventStatus
from app.repositories.base import BaseRepository

class EventRepository(BaseRepository[Event]):
    def get_active(self, db: Session, limit: int = 100) -> List[Event]:
        return db.query(Event).filter(
            Event.status.in_([EventStatus.ACTIVE, EventStatus.ONGOING])
        ).limit(limit).all()

    def get_by_status(self, db: Session, status: EventStatus, limit: int = 100) -> List[Event]:
        return db.query(Event).filter(Event.status == status).limit(limit).all()
        
    def get_by_type(self, db: Session, event_type: str, limit: int = 100) -> List[Event]:
        return db.query(Event).filter(Event.event_type == event_type).limit(limit).all()
        
    def link_source(self, db: Session, event_id: str, document_id: str, relationship_type: str = "EVIDENCE", confidence: float = 1.0) -> EventSource:
        # Check if link exists
        existing = db.query(EventSource).filter(
            EventSource.event_id == event_id,
            EventSource.document_id == document_id
        ).first()
        
        if existing:
            return existing
            
        link = EventSource(
            event_id=event_id,
            document_id=document_id,
            relationship_type=relationship_type,
            confidence=confidence
        )
        db.add(link)
        db.commit()
        db.refresh(link)
        return link

    def add_update(self, db: Session, event_id: str, document_id: Optional[str], previous_status: EventStatus, new_status: EventStatus, text: str) -> EventUpdate:
        update = EventUpdate(
            event_id=event_id,
            document_id=document_id,
            previous_status=previous_status,
            new_status=new_status,
            update_text=text
        )
        db.add(update)
        db.commit()
        db.refresh(update)
        return update

event_repo = EventRepository(Event)
