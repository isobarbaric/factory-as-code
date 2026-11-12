from typing import Any

from sqlalchemy import CheckConstraint, Column, Text, text
from sqlmodel import Field, SQLModel

from .metadata import metadata_constraints, metadata_type


class Document(SQLModel, table=True):
    __tablename__ = "documents"
    __table_args__ = (
        CheckConstraint("title ~ '[^[:space:]]'").ddl_if(dialect="postgresql"),
        CheckConstraint("length(trim(title, char(9,10,11,12,13,32))) > 0").ddl_if(
            dialect="sqlite"
        ),
        *metadata_constraints(),
    )

    repo_id: str = Field(sa_type=Text, primary_key=True)
    document_id: str = Field(sa_type=Text, primary_key=True)
    entity_name: str = Field(sa_type=Text)
    title: str = Field(sa_type=Text)
    content: str = Field(sa_type=Text)
    metadata_: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(
            "metadata", metadata_type(), nullable=False, server_default=text("'{}'")
        ),
    )
