"""Repository-scoped read operations shared by MCP and HTTP."""

import json
import os
from pathlib import Path

from sqlalchemy import Engine
from sqlmodel import create_engine

from .repositories import DocumentRepository, TicketRepository
from .responses import (
    DocumentResponse,
    DocumentSummary,
    Page,
    ProcessManifest,
    TicketResponse,
    TicketSummary,
)


class RecordUnavailable(LookupError):
    pass


def record_dict(row):
    if row is None:
        raise RecordUnavailable("Record not found")
    result = row.model_dump()
    result["metadata"] = result.pop("metadata_")
    return result


class ProcessReader:
    def __init__(self, engine: Engine, manifests: dict[str, Path]):
        self.manifests = manifests
        self.documents = DocumentRepository(engine)
        self.tickets = TicketRepository(engine)

    def _authorize(self, repo_id: str):
        if repo_id not in self.manifests:
            raise RecordUnavailable("Repository unavailable to this connection")

    def get_process(self, repo_id: str) -> ProcessManifest:
        """Read the repository's compiled process manifest."""
        self._authorize(repo_id)
        return ProcessManifest.model_validate_json(self.manifests[repo_id].read_bytes())

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
            record_dict(self.documents.get(repo_id, document_id))
        )

    def list_tickets(
        self, repo_id: str,
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
            record_dict(self.tickets.get(repo_id, ticket_id))
        )


def configured_reader() -> ProcessReader:
    config = Path(os.environ["PROCESS_REPOS"]).resolve()
    manifests = {
        repo_id: config.parent / path
        for repo_id, path in json.loads(config.read_text()).items()
    }
    engine = create_engine(os.environ["DATABASE_URL"], hide_parameters=True)
    return ProcessReader(engine, manifests)
