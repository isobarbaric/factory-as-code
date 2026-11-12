from typing import Any

from sqlalchemy import CheckConstraint, Column, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class Document(SQLModel, table=True):
    __tablename__ = "documents"
    __table_args__ = (
        CheckConstraint("jsonb_typeof(metadata) = 'object'"),
    )

    repo_id: str = Field(sa_type=Text, primary_key=True)
    document_id: str = Field(sa_type=Text, primary_key=True)
    entity_name: str = Field(sa_type=Text)
    content: str = Field(sa_type=Text)
    metadata_: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb")),
    )
