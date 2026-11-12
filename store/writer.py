"""Repository-scoped write operations for the platform API."""

import json
import re
import secrets
from collections.abc import Mapping
from pathlib import Path
from uuid import uuid4

from sqlalchemy import Engine, delete, select
from sqlalchemy.exc import IntegrityError

from .entities import TicketDefinition, entity_catalog
from .models import Comment, CommentTarget, Document, Ticket
from .reader import RecordUnavailable
from .repositories import CommentRepository
from .requests import (
    CommentCreate,
    CommentUpdate,
    DocumentCreate,
    DocumentUpdate,
    TicketCreate,
    TicketUpdate,
)
from .responses import CommentResponse, DocumentResponse, TicketResponse
from .session import FactorySession


class InvalidRecord(ValueError):
    pass


def _record_dict(row: Document | Ticket) -> dict:
    result = row.model_dump()
    result["metadata"] = result.pop("metadata_")
    return result


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:48] or "document"


def ticket_prefixes(ticket_entities: list[str]) -> dict[str, str]:
    """Give each ticket entity a short, unique ID prefix such as WO for Work Order."""
    prefixes: dict[str, str] = {}
    for name in ticket_entities:
        words = re.findall(r"[A-Za-z0-9]+", name) or ["T"]
        prefix = "".join(word[0] for word in words).upper()
        tail = words[-1].upper()
        extra = 1
        while prefix in prefixes.values():
            prefix = prefix + (tail[extra] if extra < len(tail) else str(extra))
            extra += 1
        prefixes[name] = prefix
    return prefixes


class FactoryWriter:
    def __init__(self, engine: Engine, manifests: Mapping[str, Path]):
        self.engine = engine
        self.manifests = manifests
        self.comments = CommentRepository(engine)

    def _authorize(self, repo_id: str):
        if repo_id not in self.manifests:
            raise RecordUnavailable("Repository unavailable to this connection")

    def _session(self) -> FactorySession:
        return FactorySession(self.engine, manifests=self.manifests, expire_on_commit=False)

    def _commit(self, session: FactorySession):
        try:
            session.commit()
        except (ValueError, IntegrityError) as error:
            session.rollback()
            message = error.orig if isinstance(error, IntegrityError) else error
            raise InvalidRecord(str(message)) from error

    def _catalog(self, repo_id: str):
        return entity_catalog(json.loads(self.manifests[repo_id].read_text())["entities"])

    def _next_ticket_id(self, session, repo_id: str, entity_name: str) -> str:
        catalog = self._catalog(repo_id)
        tickets = [e.name for e in catalog.values() if isinstance(e, TicketDefinition)]
        if entity_name not in tickets:
            raise InvalidRecord(f"{repo_id} does not declare {entity_name!r} as ticket")
        prefix = ticket_prefixes(tickets)[entity_name]
        ids = session.execute(
            select(Ticket.ticket_id).where(
                Ticket.repo_id == repo_id, Ticket.ticket_id.like(f"{prefix}-%")
            )
        ).scalars()
        numbers = [int(m.group(1)) for i in ids if (m := re.fullmatch(rf"{prefix}-(\d+)", i))]
        return f"{prefix}-{max(numbers, default=0) + 1}"

    # Documents

    def create_document(self, repo_id: str, body: DocumentCreate) -> DocumentResponse:
        """Create a document for one of the repository's document entities."""
        self._authorize(repo_id)
        with self._session() as session:
            row = Document(
                repo_id=repo_id,
                document_id=f"{_slug(body.title)}-{secrets.token_hex(2)}",
                entity_name=body.entity_name,
                title=body.title,
                content=body.content,
            )
            session.add(row)
            self._commit(session)
            return DocumentResponse.model_validate(_record_dict(row))

    def update_document(
        self, repo_id: str, document_id: str, body: DocumentUpdate
    ) -> DocumentResponse:
        """Change a document's title or content."""
        self._authorize(repo_id)
        with self._session() as session:
            row = session.get(Document, (repo_id, document_id))
            if row is None:
                raise RecordUnavailable("Record not found")
            for field in body.model_fields_set:
                value = getattr(body, field)
                if value is not None:
                    setattr(row, field, value)
            self._commit(session)
            return DocumentResponse.model_validate(_record_dict(row))

    def delete_document(self, repo_id: str, document_id: str) -> None:
        """Delete a document and its comments."""
        self._delete(repo_id, Document, document_id, CommentTarget.DOCUMENT)

    # Tickets

    def create_ticket(self, repo_id: str, body: TicketCreate) -> TicketResponse:
        """Create a ticket. Status defaults to the entity's first configured status."""
        self._authorize(repo_id)
        with self._session() as session:
            entity = self._catalog(repo_id).get(body.entity_name)
            status = body.status
            if status is None and isinstance(entity, TicketDefinition):
                status = entity.statuses[0]
            row = Ticket(
                repo_id=repo_id,
                ticket_id=self._next_ticket_id(session, repo_id, body.entity_name),
                entity_name=body.entity_name,
                title=body.title,
                description=body.description,
                status=status or "",
                assignee=body.assignee,
            )
            session.add(row)
            self._commit(session)
            return TicketResponse.model_validate(_record_dict(row))

    def update_ticket(self, repo_id: str, ticket_id: str, body: TicketUpdate) -> TicketResponse:
        """Change a ticket's title, description, status or assignee. A null assignee unassigns it."""
        self._authorize(repo_id)
        with self._session() as session:
            row = session.get(Ticket, (repo_id, ticket_id))
            if row is None:
                raise RecordUnavailable("Record not found")
            for field in body.model_fields_set:
                value = getattr(body, field)
                if value is not None or field == "assignee":
                    setattr(row, field, value)
            self._commit(session)
            return TicketResponse.model_validate(_record_dict(row))

    def delete_ticket(self, repo_id: str, ticket_id: str) -> None:
        """Delete a ticket and its comments."""
        self._delete(repo_id, Ticket, ticket_id, CommentTarget.TICKET)

    def _delete(self, repo_id, model, record_id, target: CommentTarget):
        self._authorize(repo_id)
        with self._session() as session:
            row = session.get(model, (repo_id, record_id))
            if row is None:
                raise RecordUnavailable("Record not found")
            session.delete(row)
            session.execute(
                delete(Comment).where(
                    Comment.repo_id == repo_id,
                    Comment.target_type == target,
                    Comment.target_id == record_id,
                )
            )
            self._commit(session)

    # Comments

    def list_comments(
        self, repo_id: str, target_type: CommentTarget, target_id: str
    ) -> list[CommentResponse]:
        """List a document's or ticket's comments, oldest first."""
        self._authorize(repo_id)
        return [
            CommentResponse.model_validate(row.model_dump())
            for row in self.comments.list(repo_id, target_type, target_id)
        ]

    def create_comment(self, repo_id: str, body: CommentCreate) -> CommentResponse:
        """Comment on a document or ticket."""
        self._authorize(repo_id)
        target = CommentTarget(body.target_type)
        model = Document if target is CommentTarget.DOCUMENT else Ticket
        with self._session() as session:
            if session.get(model, (repo_id, body.target_id)) is None:
                raise RecordUnavailable("Record not found")
            row = Comment(
                repo_id=repo_id,
                comment_id=uuid4().hex,
                target_type=target,
                target_id=body.target_id,
                author=body.author,
                body=body.body,
            )
            session.add(row)
            self._commit(session)
            return CommentResponse.model_validate(row.model_dump())

    def update_comment(
        self, repo_id: str, comment_id: str, body: CommentUpdate
    ) -> CommentResponse:
        """Edit a comment's text or resolve and reopen it."""
        self._authorize(repo_id)
        with self._session() as session:
            row = session.get(Comment, (repo_id, comment_id))
            if row is None:
                raise RecordUnavailable("Record not found")
            for field in body.model_fields_set:
                value = getattr(body, field)
                if value is not None:
                    setattr(row, field, value)
            self._commit(session)
            return CommentResponse.model_validate(row.model_dump())

    def delete_comment(self, repo_id: str, comment_id: str) -> None:
        """Delete a comment."""
        self._authorize(repo_id)
        with self._session() as session:
            row = session.get(Comment, (repo_id, comment_id))
            if row is None:
                raise RecordUnavailable("Record not found")
            session.delete(row)
            self._commit(session)
