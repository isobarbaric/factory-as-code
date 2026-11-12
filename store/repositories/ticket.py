from sqlalchemy import Engine, select
from sqlmodel import Session

from ..models import Ticket
from .pagination import page


class TicketRepository:
    def __init__(self, engine: Engine):
        self.engine = engine

    def list(
        self,
        repo_id: str,
        entity_name: str | None = None,
        status: str | None = None,
        assignee: str | None = None,
        cursor: str | None = None,
    ) -> dict:
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
        with Session(self.engine) as session:
            return page(session, query, Ticket.ticket_id)

    def get(self, repo_id: str, ticket_id: str) -> Ticket | None:
        with Session(self.engine) as session:
            return session.get(Ticket, (repo_id, ticket_id))
