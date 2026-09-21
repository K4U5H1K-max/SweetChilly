from typing import Optional
from sqlalchemy.orm import Session
from app.models.event import Event, EventStatus
from app.repositories.events import event_repo

class EventLifecycleManager:
    def evaluate_status(self, db: Session, canonical_event: Event, new_evidence: Optional[Event] = None, document_id: Optional[str] = None) -> EventStatus:
        """
        Determines the new status of a canonical event based on new evidence.
        Creates an EventUpdate if the status changes.
        """
        previous_status = canonical_event.status
        new_status = previous_status
        
        if new_evidence:
            # Simple state machine based on evidence
            if new_evidence.status == EventStatus.RESOLVED:
                new_status = EventStatus.RESOLVED
            elif new_evidence.status == EventStatus.ACTIVE and previous_status == EventStatus.RESOLVED:
                # Event has re-occurred or was prematurely resolved
                new_status = EventStatus.ACTIVE
                
        # If no new evidence, check if it's expired based on temporal metadata
        if not new_evidence and previous_status in [EventStatus.ACTIVE, EventStatus.ONGOING]:
            # This would typically run in a periodic cleanup job
            # Check expected_end
            import datetime
            if canonical_event.metadata_json and "temporal" in canonical_event.metadata_json:
                expected_end = canonical_event.metadata_json["temporal"].get("expected_end")
                if expected_end and expected_end < datetime.datetime.utcnow():
                    new_status = EventStatus.EXPIRED

        if new_status != previous_status:
            canonical_event.status = new_status
            event_repo.add_update(
                db=db,
                event_id=canonical_event.id,
                document_id=document_id,
                previous_status=previous_status,
                new_status=new_status,
                text=f"Status transitioned from {previous_status} to {new_status}"
            )
            
        return new_status
