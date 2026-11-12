from sqlalchemy import Engine, select
from sqlmodel import Session

from ..models import Document
from .pagination import page


class DocumentRepository:
    def __init__(self, engine: Engine):
        self.engine = engine

    def list(
        self, repo_id: str, entity_name: str | None = None, cursor: str | None = None
    ) -> dict:
        query = select(Document.document_id, Document.entity_name).where(
            Document.repo_id == repo_id
        )
        if cursor is not None:
            query = query.where(Document.document_id > cursor)
        if entity_name is not None:
            query = query.where(Document.entity_name == entity_name)
        with Session(self.engine) as session:
            return page(session, query, Document.document_id)

    def get(self, repo_id: str, document_id: str) -> Document | None:
        with Session(self.engine) as session:
            return session.get(Document, (repo_id, document_id))
