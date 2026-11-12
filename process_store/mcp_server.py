"""Read process records over MCP stdio."""

import json
import os
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP
from sqlalchemy import select
from sqlmodel import Session, create_engine

from .models import Document, Ticket


PAGE_SIZE = 50


def page(session, query, column):
    rows = session.execute(query.order_by(column).limit(PAGE_SIZE + 1)).mappings().all()
    items = [dict(row) for row in rows[:PAGE_SIZE]]
    cursor = items[-1][column.key] if len(rows) > PAGE_SIZE else None
    return {"items": items, "next_cursor": cursor}


def record_dict(row):
    if row is None:
        raise ValueError("Record not found")
    result = row.model_dump()
    result["metadata"] = result.pop("metadata_")
    return result


def create_server(engine, manifests: dict[str, Path]):
    server = FastMCP("Process records")

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
        with Session(engine) as session:
            return page(session, query, rows.c.document_id)

    @server.tool()
    def get_document(
        repo_id: str, document_id: str, version_number: int | None = None
    ) -> dict[str, Any]:
        """Read the specified revision, or the latest when no version is supplied."""
        authorize(repo_id)
        query = select(Document).where(
            Document.repo_id == repo_id, Document.document_id == document_id
        )
        if version_number is not None:
            query = query.where(Document.version_number == version_number)
        with Session(engine) as session:
            return record_dict(
                session.scalar(query.order_by(Document.version_number.desc()).limit(1))
            )

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
        query = select(
            Ticket.ticket_id,
            Ticket.entity_name,
            Ticket.title,
            Ticket.status,
            Ticket.assignee,
        ).where(Ticket.repo_id == repo_id)
        for column, value in (
            (Ticket.entity_name, entity_name),
            (Ticket.status, status),
            (Ticket.assignee, assignee),
        ):
            if value is not None:
                query = query.where(column == value)
        if cursor is not None:
            query = query.where(Ticket.ticket_id > cursor)
        with Session(engine) as session:
            return page(session, query, Ticket.ticket_id)

    @server.tool()
    def get_ticket(repo_id: str, ticket_id: str) -> dict[str, Any]:
        """Read the full current ticket."""
        authorize(repo_id)
        with Session(engine) as session:
            return record_dict(session.get(Ticket, (repo_id, ticket_id)))

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
