import json
from collections.abc import Mapping
from pathlib import Path

from sqlalchemy import event
from sqlmodel import Session

from .models import Document, Files, Ticket


class ProcessSession(Session):
    def __init__(self, bind, *, manifests: Mapping[str, Path], **kwargs):
        super().__init__(bind, **kwargs)
        self.manifests = manifests


@event.listens_for(ProcessSession, "before_flush")
def validate_writes(session, flush_context, instances):
    entity_types = {Document: "document", Ticket: "ticket", Files: "files"}
    catalogs = {}
    for row in session.new.union(session.dirty):
        kind = entity_types.get(type(row))
        if kind is None:
            continue
        if row in session.dirty:
            if not session.is_modified(row):
                continue
            if isinstance(row, Document):
                raise ValueError("Document revisions are immutable. Insert a new revision.")
        repo = row.repo_name
        if repo not in catalogs:
            path = session.manifests.get(repo)
            if path is None:
                raise ValueError(f"No manifest configured for {repo}")
            manifest = json.loads(path.read_text())
            catalogs[repo] = {entry["name"]: entry["type"] for entry in manifest["entities"]}
        if catalogs[repo].get(row.entity_name) != kind:
            raise ValueError(f"{repo} does not declare {row.entity_name!r} as {kind}")
