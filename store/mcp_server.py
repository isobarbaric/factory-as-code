"""Read process records over MCP stdio."""

import json
import os
from pathlib import Path

from mcp.server.fastmcp import FastMCP
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


def record_dict(row):
    if row is None:
        raise ValueError("Record not found")
    result = row.model_dump()
    result["metadata"] = result.pop("metadata_")
    return result


def create_server(engine, manifests: dict[str, Path]):
    server = FastMCP("Process records")

    documents = DocumentRepository(engine)
    tickets = TicketRepository(engine)

    def authorize(repo_id: str):
        if repo_id not in manifests:
            raise ValueError("Repository unavailable to this connection")

    @server.tool()
    def get_process(repo_id: str) -> ProcessManifest:
        """Read the repository's compiled process manifest."""
        authorize(repo_id)
        return ProcessManifest.model_validate_json(manifests[repo_id].read_bytes())

    @server.tool()
    def list_documents(
        repo_id: str, entity_name: str | None = None, cursor: str | None = None
    ) -> Page[DocumentSummary]:
        """List the summary for each matching document."""
        authorize(repo_id)
        return Page[DocumentSummary].model_validate(
            documents.list(repo_id, entity_name, cursor)
        )

    @server.tool()
    def get_document(repo_id: str, document_id: str) -> DocumentResponse:
        """Read the current document."""
        authorize(repo_id)
        return DocumentResponse.model_validate(
            record_dict(documents.get(repo_id, document_id))
        )

    @server.tool()
    def list_tickets(
        repo_id: str,
        entity_name: str | None = None,
        status: str | None = None,
        assignee: str | None = None,
        cursor: str | None = None,
    ) -> Page[TicketSummary]:
        """List matching ticket summaries in ticket ID order."""
        authorize(repo_id)
        return Page[TicketSummary].model_validate(
            tickets.list(repo_id, entity_name, status, assignee, cursor)
        )

    @server.tool()
    def get_ticket(repo_id: str, ticket_id: str) -> TicketResponse:
        """Read the full current ticket."""
        authorize(repo_id)
        return TicketResponse.model_validate(
            record_dict(tickets.get(repo_id, ticket_id))
        )

    return server


def main():
    config = Path(os.environ["PROCESS_REPOS"]).resolve()
    manifests = {
        repo_id: config.parent / path
        for repo_id, path in json.loads(config.read_text()).items()
    }
    engine = create_engine(os.environ["DATABASE_URL"], hide_parameters=True)
    create_server(engine, manifests).run(transport="stdio")


if __name__ == "__main__":
    main()
