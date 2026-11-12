import hmac
import json
import os
import secrets
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from flask import Flask, abort, redirect, render_template, request, session, url_for
from sqlmodel import create_engine, select

from process_store import Document, Files, ProcessSession, Ticket
from process_store.entities import entity_catalog


def create_app():
    app = Flask(__name__)
    app.secret_key = secrets.token_bytes(32)
    repo = os.environ["PROCESS_REPO"]
    manifest = Path(os.environ.get("PROCESS_MANIFEST", ".process/dist/process.json"))
    engine = create_engine(os.environ["DATABASE_URL"])
    models = {"document": Document, "ticket": Ticket, "files": Files}

    def store():
        return ProcessSession(engine, manifests={repo: manifest}, expire_on_commit=False)

    def config():
        return json.loads(manifest.read_text())

    def entity_for(cfg):
        name = request.args.get("entity")
        return entity_catalog(cfg["entities"]).get(name) or abort(404)

    def render(cfg, **context):
        session.setdefault("csrf", secrets.token_hex(32))
        return render_template("workspace.html", repo=repo, cfg=cfg, **context)

    @app.get("/")
    def home():
        entities = config()["entities"]
        if entities:
            return redirect(url_for("browse", entity=entities[0]["name"]))
        return redirect(url_for("settings"))

    @app.get("/settings")
    def settings():
        return render(config(), settings=True, config_url=os.environ.get("PROCESS_CONFIG_URL"))

    @app.get("/browse")
    def browse():
        cfg = config()
        entity = entity_for(cfg)
        model = models[entity.type]
        query = select(model).where(model.repo_name == repo, model.entity_name == entity.name)
        selected = request.args.get("id")
        summaries = {}
        versions = []
        row = None
        with store() as db:
            if model is Document:
                ids = db.exec(select(Document.document_id, Document.title)
                    .where(Document.repo_name == repo, Document.entity_name == entity.name)
                    .distinct(Document.document_id).order_by(Document.document_id, Document.version_number.desc())).all()
                items = sorted(ids, key=lambda item: (item.title, item.document_id))
                if selected is not None:
                    versions = db.exec(select(Document.version_number).where(Document.repo_name == repo,
                        Document.entity_name == entity.name, Document.document_id == selected)
                        .order_by(Document.version_number.desc())).all()
                    raw = request.args.get("version")
                    if raw is not None and not raw.isdecimal():
                        abort(400)
                    if versions:
                        row = db.get(Document, (repo, selected, int(raw) if raw else versions[0]))
                        if row and row.entity_name != entity.name:
                            abort(404)
            else:
                id_col = Ticket.ticket_id if model is Ticket else Files.files_id
                records = db.exec(query.order_by(id_col)).all()
                if model is Ticket:
                    summaries = {r.ticket_id: (r.status, r.assignee) for r in records}
                items = [(r.ticket_id, r.title) if model is Ticket else (r.files_id, r.files_id) for r in records]
                if selected is not None:
                    row = next((r for r in records if getattr(r, id_col.key) == selected), None)
        if selected is not None and row is None:
            abort(404)
        if selected is None and items:
            return redirect(url_for("browse", entity=entity.name, id=items[0][0]))
        objects, error = [], None
        if isinstance(row, Files):
            if not os.environ.get("PROCESS_BUCKET"):
                error = "Configure the object store to browse this collection."
            else:
                try:
                    prefix = object_prefix(row)
                    pages = object_store().get_paginator("list_objects_v2").paginate(
                        Bucket=os.environ["PROCESS_BUCKET"], Prefix=prefix)
                    objects = [obj["Key"][len(prefix):] for page in pages for obj in page.get("Contents", [])
                               if not obj["Key"].endswith("/")]
                except (BotoCoreError, ClientError):
                    error = "The object store could not list this collection."
        return render(cfg, entity=entity, items=items, selected=selected, row=row,
                      versions=versions, summaries=summaries, objects=objects, error=error)

    @app.post("/ticket")
    def update_ticket():
        if not session.get("csrf") or not hmac.compare_digest(session["csrf"], request.form.get("csrf", "")):
            abort(403)
        entity = entity_for(config())
        if entity.type != "ticket":
            abort(404)
        with store() as db:
            row = db.get(Ticket, (repo, request.args["id"]), with_for_update=True)
            if not row or row.entity_name != entity.name:
                abort(404)
            if row.status != request.form["previous_status"] or (row.assignee or "") != request.form["previous_assignee"]:
                abort(409, "This ticket changed. Reload it before saving.")
            if request.form["status"] not in entity.statuses:
                abort(400, "Choose a declared ticket status.")
            row.status = request.form["status"]
            row.assignee = request.form["assignee"].strip() or None
            db.commit()
        return redirect(url_for("browse", entity=entity.name, id=request.args["id"]), code=303)

    def object_store():
        return boto3.client("s3", endpoint_url=os.environ.get("PROCESS_S3_ENDPOINT"))

    def object_prefix(row):
        if not row.object_prefix.strip("/"):
            abort(409, "This collection has no storage prefix.")
        return f"{repo}/{row.object_prefix.strip('/')}/"

    @app.get("/file")
    def file():
        entity = entity_for(config())
        with store() as db:
            row = db.get(Files, (repo, request.args["id"]))
            if entity.type != "files" or not row or row.entity_name != entity.name:
                abort(404)
        name = request.args["path"]
        if any(part in ("", ".", "..") for part in name.split("/")):
            abort(400)
        client = object_store()
        bucket = os.environ.get("PROCESS_BUCKET") or abort(503)
        params = {"Bucket": bucket, "Key": object_prefix(row) + name}
        try:
            if "download" in request.args:
                params["ResponseContentDisposition"] = "attachment"
                return redirect(client.generate_presigned_url("get_object", Params=params, ExpiresIn=300))
            preview = None
            if Path(name).suffix.lower() in {".txt", ".md", ".json", ".xml", ".csv", ".log", ".html", ".yaml"}:
                response = client.get_object(**params, Range="bytes=0-65535") if client.head_object(**params)["ContentLength"] else None
                preview = response["Body"].read().decode("utf-8", "replace") if response else ""
            return render(config(), entity=entity, file_name=name, preview=preview, selected=row.files_id)
        except (BotoCoreError, ClientError):
            abort(502, "The object store could not retrieve this file.")

    return app
