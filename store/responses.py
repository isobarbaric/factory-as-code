"""Wire contracts for the process MCP tools."""

from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, JsonValue, RootModel
from typing_extensions import NotRequired, TypedDict


class EntityDefinition(TypedDict):
    name: str
    type: Literal["document", "ticket", "files"]


class DirectoryRoot(TypedDict):
    root: str


class ManifestFields(TypedDict):
    entities: list[EntityDefinition]
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


class ProcessManifest(RootModel[ManifestFields]):
    pass


class DocumentSummary(BaseModel):
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
