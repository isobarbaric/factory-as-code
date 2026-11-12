from typing import Any

from sqlalchemy import CheckConstraint, Column, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class Ticket(SQLModel, table=True):
    __tablename__ = "tickets"
    __table_args__ = (
        CheckConstraint("title ~ '[^[:space:]]'"),
        CheckConstraint("jsonb_typeof(metadata) = 'object'"),
    )

    repo_name: str = Field(sa_type=Text, primary_key=True)
    ticket_id: str = Field(sa_type=Text, primary_key=True)
    entity_name: str = Field(sa_type=Text)
    title: str = Field(sa_type=Text)
    description: str = Field(sa_type=Text)
    status: str = Field(sa_type=Text)
    assignee: str | None = Field(default=None, sa_type=Text)
    metadata_: dict[str, Any] | None = Field(
        default=None, sa_column=Column("metadata", JSONB(none_as_null=True), nullable=True)
    )
