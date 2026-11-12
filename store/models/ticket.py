from typing import Any

from sqlalchemy import CheckConstraint, Column, Text
from sqlmodel import Field, SQLModel

from .metadata import metadata_constraints, metadata_type


class Ticket(SQLModel, table=True):
    __tablename__ = "tickets"
    __table_args__ = (
        CheckConstraint("title ~ '[^[:space:]]'").ddl_if(dialect="postgresql"),
        CheckConstraint("length(trim(title, char(9,10,11,12,13,32))) > 0").ddl_if(
            dialect="sqlite"
        ),
        *metadata_constraints(),
    )

    repo_id: str = Field(sa_type=Text, primary_key=True)
    ticket_id: str = Field(sa_type=Text, primary_key=True)
    entity_name: str = Field(sa_type=Text)
    title: str = Field(sa_type=Text)
    description: str = Field(sa_type=Text)
    status: str = Field(sa_type=Text)
    assignee: str | None = Field(default=None, sa_type=Text)
    metadata_: dict[str, Any] | None = Field(
        default=None, sa_column=Column("metadata", metadata_type(), nullable=True)
    )
