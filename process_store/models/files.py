from typing import Any

from sqlalchemy import CheckConstraint, Column, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


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
