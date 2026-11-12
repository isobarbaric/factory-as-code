from typing import Any

from sqlalchemy import Column, Text, UniqueConstraint
from sqlmodel import Field, SQLModel

from .metadata import metadata_constraints, metadata_type


class Files(SQLModel, table=True):
    __tablename__ = "files"
    __table_args__ = (
        UniqueConstraint("repo_id", "object_prefix"),
        *metadata_constraints(),
    )

    repo_id: str = Field(sa_type=Text, primary_key=True)
    files_id: str = Field(sa_type=Text, primary_key=True)
    entity_name: str = Field(sa_type=Text)
    object_prefix: str = Field(sa_type=Text)
    metadata_: dict[str, Any] | None = Field(
        default=None, sa_column=Column("metadata", metadata_type(), nullable=True)
    )
