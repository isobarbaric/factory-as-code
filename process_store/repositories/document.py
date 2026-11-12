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
        latest = (
            select(Document.document_id, Document.entity_name, Document.version_number)
            .where(Document.repo_id == repo_id)
            .distinct(Document.document_id)
            .order_by(Document.document_id, Document.version_number.desc())
        )
        if cursor is not None:
            latest = latest.where(Document.document_id > cursor)
        rows = latest.subquery()
        query = select(rows)
        if entity_name is not None:
            query = query.where(rows.c.entity_name == entity_name)
        with Session(self.engine) as session:
            return page(session, query, rows.c.document_id)

    def get(
        self, repo_id: str, document_id: str, version_number: int | None = None
    ) -> Document | None:
        query = select(Document).where(
            Document.repo_id == repo_id, Document.document_id == document_id
        )
        if version_number is not None:
            query = query.where(Document.version_number == version_number)
        with Session(self.engine) as session:
            return session.scalar(
                query.order_by(Document.version_number.desc()).limit(1)
            )
