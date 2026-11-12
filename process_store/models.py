from typing import Any

from sqlalchemy import CheckConstraint, Column, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class Document(SQLModel, table=True):
    __tablename__ = "documents"
    __table_args__ = (
        CheckConstraint("version_number > 0"),
        CheckConstraint("title ~ '[^[:space:]]'"),
        CheckConstraint("jsonb_typeof(metadata) = 'object'"),
    )

    repo_name: str = Field(sa_type=Text, primary_key=True)
    document_id: str = Field(sa_type=Text, primary_key=True)
    version_number: int = Field(primary_key=True, sa_column_kwargs={"autoincrement": False})
    entity_name: str = Field(sa_type=Text)
    title: str = Field(sa_type=Text)
    content: str = Field(sa_type=Text)
    metadata_: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb")),
    )


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


class Files(SQLModel, table=True):
    __tablename__ = "files"
    __table_args__ = (
        UniqueConstraint("repo_name", "object_prefix"),
        CheckConstraint("jsonb_typeof(metadata) = 'object'"),
    )

    repo_name: str = Field(sa_type=Text, primary_key=True)
    files_id: str = Field(sa_type=Text, primary_key=True)
    entity_name: str = Field(sa_type=Text)
    object_prefix: str = Field(sa_type=Text)
    metadata_: dict[str, Any] | None = Field(
        default=None, sa_column=Column("metadata", JSONB(none_as_null=True), nullable=True)
    )
