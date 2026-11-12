"""Request bodies for the platform API's write routes."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints

NonBlank = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class WriteModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DocumentCreate(WriteModel):
    entity_name: str
    title: NonBlank
    content: str = ""


class DocumentUpdate(WriteModel):
    title: NonBlank | None = None
    content: str | None = None


class TicketCreate(WriteModel):
    entity_name: str
    title: NonBlank
    description: str = ""
    status: str | None = None
    assignee: NonBlank | None = None


class TicketUpdate(WriteModel):
    title: NonBlank | None = None
    description: str | None = None
    status: str | None = None
    assignee: NonBlank | None = None


class CommentCreate(WriteModel):
    target_type: Literal["document", "ticket"]
    target_id: str
    author: NonBlank
    body: NonBlank


class CommentUpdate(WriteModel):
    body: NonBlank | None = None
    resolved: bool | None = None
