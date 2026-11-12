"""Repository-scoped read operations shared by MCP and HTTP."""

import json
import os
from pathlib import Path

from sqlalchemy import Engine
from sqlmodel import create_engine

from .models import Document, Ticket
from .repositories import DocumentRepository, TicketRepository
from .responses import (
    DocumentResponse,
    DocumentSummary,
    Page,
    FactoryManifest,
    RepositorySummary,
    TicketResponse,
    TicketSummary,
)


class RecordUnavailable(LookupError):
    pass


def _record_dict(row: Document | Ticket | None) -> dict:
    if row is None:
        raise RecordUnavailable("Record not found")
    result = row.model_dump()
    result["metadata"] = result.pop("metadata_")
    return result


def _repository_name(manifest: Path) -> str:
    parts = manifest.parts
    if ".factory" in parts:
        index = len(parts) - 1 - parts[::-1].index(".factory")
        if index > 0:
            return parts[index - 1]
    return manifest.stem


class FactoryReader:
    def __init__(self, engine: Engine, manifests: dict[str, Path]):
        self.manifests = manifests
        self.documents = DocumentRepository(engine)
        self.tickets = TicketRepository(engine)

    def _authorize(self, repo_id: str):
        if repo_id not in self.manifests:
            raise RecordUnavailable("Repository unavailable to this connection")

    def list_repositories(self) -> list[RepositorySummary]:
        """List the repositories this connection may read, named after the folder holding .factory."""
        return [
            RepositorySummary(repo_id=repo_id, name=_repository_name(path))
            for repo_id, path in self.manifests.items()
        ]

    def get_factory(self, repo_id: str) -> FactoryManifest:
        """Read the repository's compiled factory manifest."""
        self._authorize(repo_id)
        return FactoryManifest.model_validate_json(self.manifests[repo_id].read_bytes())

    def list_documents(
        self, repo_id: str, entity_name: str | None = None, cursor: str | None = None
    ) -> Page[DocumentSummary]:
        """List the summary for each matching document."""
        self._authorize(repo_id)
        return Page[DocumentSummary].model_validate(
            self.documents.list(repo_id, entity_name, cursor)
        )

    def get_document(self, repo_id: str, document_id: str) -> DocumentResponse:
        """Read the current document."""
        self._authorize(repo_id)
        return DocumentResponse.model_validate(
            _record_dict(self.documents.get(repo_id, document_id))
        )

    def list_tickets(
        self,
        repo_id: str,
        entity_name: str | None = None,
        status: str | None = None,
        assignee: str | None = None,
        cursor: str | None = None,
    ) -> Page[TicketSummary]:
        """List matching ticket summaries in ticket ID order."""
        self._authorize(repo_id)
        return Page[TicketSummary].model_validate(
            self.tickets.list(repo_id, entity_name, status, assignee, cursor)
        )

    def get_ticket(self, repo_id: str, ticket_id: str) -> TicketResponse:
        """Read the full current ticket."""
        self._authorize(repo_id)
        return TicketResponse.model_validate(
            _record_dict(self.tickets.get(repo_id, ticket_id))
        )


def configured_store() -> tuple[Engine, dict[str, Path]]:
    config = Path(os.environ["FACTORY_REPOS"]).resolve()
    manifests = {
        repo_id: config.parent / path
        for repo_id, path in json.loads(config.read_text()).items()
    }
    engine = create_engine(os.environ["DATABASE_URL"], hide_parameters=True)
    return engine, manifests


def configured_reader() -> FactoryReader:
    return FactoryReader(*configured_store())
