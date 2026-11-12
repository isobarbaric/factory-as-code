"""Read process records over MCP stdio."""

import json
import os
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP
from sqlmodel import create_engine

from .repositories import DocumentRepository, TicketRepository


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
    def get_process(repo_id: str) -> dict[str, Any]:
        """Read the repository's compiled process manifest."""
        authorize(repo_id)
        return json.loads(manifests[repo_id].read_text())

    @server.tool()
    def list_documents(
        repo_id: str, entity_name: str | None = None, cursor: str | None = None
    ) -> dict[str, Any]:
        """List the latest revision summary for each matching document."""
        authorize(repo_id)
        return documents.list(repo_id, entity_name, cursor)

    @server.tool()
    def get_document(
        repo_id: str, document_id: str, version_number: int | None = None
    ) -> dict[str, Any]:
        """Read the specified revision, or the latest when no version is supplied."""
        authorize(repo_id)
        return record_dict(documents.get(repo_id, document_id, version_number))

    @server.tool()
    def list_tickets(
        repo_id: str,
        entity_name: str | None = None,
        status: str | None = None,
        assignee: str | None = None,
        cursor: str | None = None,
    ) -> dict[str, Any]:
        """List matching ticket summaries in ticket ID order."""
        authorize(repo_id)
        return tickets.list(repo_id, entity_name, status, assignee, cursor)

    @server.tool()
    def get_ticket(repo_id: str, ticket_id: str) -> dict[str, Any]:
        """Read the full current ticket."""
        authorize(repo_id)
        return record_dict(tickets.get(repo_id, ticket_id))

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
