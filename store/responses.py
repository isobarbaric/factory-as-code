"""Wire contracts for the factory MCP tools."""

from datetime import datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, JsonValue, RootModel
from typing_extensions import NotRequired, TypedDict


from .entities import Entity


class DirectoryRoot(TypedDict):
    root: str


class ManifestFields(TypedDict):
    entities: list[Entity]
    integrations: NotRequired[
        list[
            Literal[
                "gmail",
                "googledrive",
                "outlook",
                "googlesheets",
                "supabase",
                "notion",
                "slack",
                "airtable",
                "googledocs",
                "hubspot",
            ]
        ]
    ]
    skills: NotRequired[DirectoryRoot]
    automations: NotRequired[DirectoryRoot]


class FactoryManifest(RootModel[ManifestFields]):
    pass


class DocumentSummary(BaseModel):
    title: str
    document_id: str
    entity_name: str


class DocumentResponse(DocumentSummary):
    repo_id: str
    content: str
    metadata: dict[str, JsonValue]


class TicketSummary(BaseModel):
    ticket_id: str
    entity_name: str
    title: str
    status: str
    assignee: str | None


class TicketResponse(TicketSummary):
    repo_id: str
    description: str
    metadata: dict[str, JsonValue] | None


Item = TypeVar("Item")


class Page(BaseModel, Generic[Item]):
    items: list[Item]
    next_cursor: str | None


class RepositorySummary(BaseModel):
    repo_id: str
    name: str


class CommentResponse(BaseModel):
    repo_id: str
    comment_id: str
    target_type: Literal["document", "ticket"]
    target_id: str
    author: str
    body: str
    resolved: bool
    created_at: datetime
