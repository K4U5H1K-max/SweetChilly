from typing import List, Tuple
import datetime
from app.models.event import Event
from app.core.enums import EventStatus

class EventClusteringPipeline:
    def cluster(self, new_events: List[Event], existing_active_events: List[Event]) -> List[Event]:
        """
        Groups new events that describe the same real-world occurrence into canonical events.
        Matches new events against existing active events to update them rather than create duplicates.
        """
        canonical_events = []
        
        # We will mutate the list of active events to include merged ones
        # so we don't accidentally cluster two new identical events separately.
        pool = list(existing_active_events)
        
        for new_event in new_events:
            match = self._find_best_match(new_event, pool)
            if match:
                # Merge into existing event
                self._merge_events(match, new_event)
                if match not in canonical_events: # Add to result if we modified an existing one
                    canonical_events.append(match)
            else:
                # This is a new distinct canonical event
                pool.append(new_event)
                canonical_events.append(new_event)
                
        return canonical_events

    def _find_best_match(self, new_event: Event, pool: List[Event]) -> Event | None:
        best_match = None
        highest_score = 0.0
        
        for existing in pool:
            # Hard filter: if types don't match, they aren't the same event
            if new_event.event_type != existing.event_type:
                continue
                
            score = 0.0
            
            # 1. Title/Content similarity (Jaccard on words is simple but effective)
            title1 = set(str(new_event.title).lower().split())
            title2 = set(str(existing.title).lower().split())
            if title1 and title2:
                overlap = len(title1.intersection(title2))
                jaccard = overlap / float(len(title1.union(title2)))
                if jaccard > 0.4:
                    score += 2.0
                    
            # 2. Location Proximity (Semantic for now, since we haven't strictly joined the spatial coords here)
            # If they extract exactly the same locations
            new_locs = self._get_location_names(new_event)
            ex_locs = self._get_location_names(existing)
            if new_locs and ex_locs and new_locs.intersection(ex_locs):
                score += 3.0
                
            # 3. Time proximity (Start time within 24 hours)
            new_start = self._get_start_time(new_event)
            ex_start = self._get_start_time(existing)
            if new_start and ex_start:
                diff = abs((new_start - ex_start).total_seconds())
                if diff < 86400: # 24 hours
                    score += 2.0
            
            # 4. Same cause
            if new_event.cause != "UNKNOWN" and new_event.cause == existing.cause:
                score += 1.0
                
            if score > highest_score and score >= 4.0: # Threshold for a match
                highest_score = score
                best_match = existing
                
        return best_match

    def _merge_events(self, target: Event, source: Event):
        # Update target event with source info if it's more confident
        if source.confidence > target.confidence:
            target.title = source.title
            target.summary = source.summary
            target.confidence = source.confidence
            
        # The Orchestrator will handle creating the EventSource linking the document to the target event
        
    def _get_location_names(self, event: Event) -> set:
        if not event.metadata_json or "extracted_entities" not in event.metadata_json:
            return set()
        return {e["normalized_value"] for e in event.metadata_json["extracted_entities"] if e["type"] == "LOCATION"}

    def _get_start_time(self, event: Event) -> datetime.datetime | None:
        if not event.metadata_json or "temporal" not in event.metadata_json:
            return None
        return event.metadata_json["temporal"].get("event_start")
