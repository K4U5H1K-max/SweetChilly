from typing import Optional
from sqlalchemy.orm import Session
from app.models.source import Source, SourceRun
from app.repositories.base import BaseRepository

class SourceRepository(BaseRepository[Source]):
    def get_by_name(self, db: Session, name: str) -> Optional[Source]:
        return db.query(Source).filter(Source.name == name).first()

class SourceRunRepository(BaseRepository[SourceRun]):
    def get_latest_for_source(self, db: Session, source_id: str) -> Optional[SourceRun]:
        return db.query(SourceRun).filter(SourceRun.source_id == source_id).order_by(SourceRun.started_at.desc()).first()

source_repo = SourceRepository(Source)
source_run_repo = SourceRunRepository(SourceRun)
