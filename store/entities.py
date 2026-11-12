from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, field_validator


class EntityDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    type: Literal["document", "files"]


class TicketDefinition(EntityDefinition):
    type: Literal["ticket"]
    statuses: list[str] = Field(min_length=1)

    @field_validator("statuses")
    @classmethod
    def validate_statuses(cls, statuses: list[str]) -> list[str]:
        if any(not value or value != value.strip() for value in statuses):
            raise ValueError("Statuses must be nonblank and trimmed")
        if len(set(statuses)) != len(statuses):
            raise ValueError("Statuses must be unique")
        return statuses


Entity = Annotated[TicketDefinition | EntityDefinition, Field(discriminator="type")]


def entity_catalog(entries):
    return {entity.name: entity for entity in TypeAdapter(list[Entity]).validate_python(entries)}
