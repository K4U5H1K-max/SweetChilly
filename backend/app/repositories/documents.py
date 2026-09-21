from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.document import RawDocument, Document
from app.repositories.base import BaseRepository

class RawDocumentRepository(BaseRepository[RawDocument]):
    def get_by_url(self, db: Session, url: str) -> Optional[RawDocument]:
        return db.query(RawDocument).filter(
            or_(
                RawDocument.original_url == url,
                RawDocument.canonical_url == url
            )
        ).first()
        
    def get_unprocessed(self, db: Session, limit: int = 100) -> List[RawDocument]:
        # Returns raw documents that do not have a corresponding Document
        return db.query(RawDocument).outerjoin(Document, RawDocument.id == Document.raw_document_id).filter(
            Document.id == None
        ).limit(limit).all()

class DocumentRepository(BaseRepository[Document]):
    def get_by_raw_id(self, db: Session, raw_id: str) -> Optional[Document]:
        return db.query(Document).filter(Document.raw_document_id == raw_id).first()

    def get_relevant_unextracted(self, db: Session, limit: int = 100) -> List[Document]:
        from app.models.event import EventSource
        # Returns relevant documents that haven't been associated with an event
        return db.query(Document).outerjoin(EventSource, Document.id == EventSource.document_id).filter(
            Document.is_relevant == True,
            EventSource.id == None
        ).limit(limit).all()

raw_document_repo = RawDocumentRepository(RawDocument)
document_repo = DocumentRepository(Document)
