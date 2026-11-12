from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import CheckConstraint, Column, DateTime, Index, Text
from sqlmodel import Field, SQLModel


class CommentTarget(str, Enum):
    DOCUMENT = "document"
    TICKET = "ticket"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Comment(SQLModel, table=True):
    __tablename__ = "comments"
    __table_args__ = (
        CheckConstraint(
            "target_type IN ({})".format(", ".join(f"'{t.value}'" for t in CommentTarget))
        ),
        CheckConstraint("body ~ '[^[:space:]]'").ddl_if(dialect="postgresql"),
        CheckConstraint("length(trim(body, char(9,10,11,12,13,32))) > 0").ddl_if(
            dialect="sqlite"
        ),
        Index("comments_target", "repo_id", "target_type", "target_id"),
    )

    repo_id: str = Field(sa_type=Text, primary_key=True)
    comment_id: str = Field(sa_type=Text, primary_key=True)
    target_type: str = Field(sa_type=Text)
    target_id: str = Field(sa_type=Text)
    author: str = Field(sa_type=Text)
    body: str = Field(sa_type=Text)
    resolved: bool = Field(default=False)
    created_at: datetime = Field(
        default_factory=_now, sa_column=Column(DateTime(timezone=True), nullable=False)
    )
