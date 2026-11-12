import json
from collections.abc import Mapping
from pathlib import Path

from sqlalchemy import event
from sqlmodel import Session

from .entities import entity_catalog
from .models import Document, Files, Ticket


class FactorySession(Session):
    def __init__(self, bind, *, manifests: Mapping[str, Path], **kwargs):
        super().__init__(bind, **kwargs)
        self.manifests = manifests


@event.listens_for(FactorySession, "before_flush")
def validate_writes(session, flush_context, instances):
    entity_types = {Document: "document", Ticket: "ticket", Files: "files"}
    catalogs = {}
    for row in session.new.union(session.dirty):
        kind = entity_types.get(type(row))
        if kind is None:
            continue
        if row in session.dirty and not session.is_modified(row):
            continue
        repo = row.repo_id
        if repo not in catalogs:
            path = session.manifests.get(repo)
            if path is None:
                raise ValueError(f"No manifest configured for {repo}")
            manifest = json.loads(path.read_text())
            catalogs[repo] = entity_catalog(manifest["entities"])
        entity = catalogs[repo].get(row.entity_name)
        if entity is None or entity.type != kind:
            raise ValueError(f"{repo} does not declare {row.entity_name!r} as {kind}")
        if isinstance(row, Ticket) and row.status not in entity.statuses:
            raise ValueError(f"Invalid status {row.status!r} for {entity.name}")
