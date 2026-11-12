"""Run with DATABASE_URL pointing to PostgreSQL after installing UI dependencies."""

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from sqlalchemy import text
from sqlmodel import SQLModel, Session, create_engine

from process_store import Document, Files, Ticket
from process_ui.app import create_app

ROOT = Path(__file__).resolve().parents[1]


class BrowseContractTest(unittest.TestCase):
    def setUp(self):
        # A transaction-scoped schema keeps fixtures isolated from existing records.
        self.engine = create_engine(os.environ["DATABASE_URL"])
        self.addCleanup(self.engine.dispose)
        connection = self.engine.connect()
        self.addCleanup(connection.close)
        transaction = connection.begin()
        self.addCleanup(transaction.rollback)
        schema = "ui_test_" + uuid4().hex
        connection.execute(text(f"CREATE SCHEMA {schema}"))
        connection.execute(text(f"SET LOCAL search_path TO {schema}"))
        SQLModel.metadata.create_all(connection)
        with Session(connection) as db:
            db.add_all([
                Document(repo_name="test", entity_name="Docs", document_id="d", title="Doc",
                         version_number=1, content="Body", metadata_={"author": "A"}),
                Ticket(repo_name="test", entity_name="Issues", ticket_id="t", title="Issue",
                       description="", status="Open"),
                Files(repo_name="test", entity_name="Reports", files_id="f", object_prefix="reports"),
            ])
            db.commit()
        temp = tempfile.TemporaryDirectory(dir=ROOT)
        self.addCleanup(temp.cleanup)
        self.temp = Path(temp.name)
        manifest = self.temp / "manifest.json"
        manifest.write_text(json.dumps({"entities": [
            {"name": "Docs", "type": "document"},
            {"name": "Issues", "type": "ticket", "statuses": ["Open", "Done"]},
            {"name": "Reports", "type": "files"},
        ]}))
        env = patch.dict(os.environ, PROCESS_MANIFEST=str(manifest), PROCESS_REPO="test", PROCESS_BUCKET="")
        env.start()
        self.addCleanup(env.stop)
        with patch("process_ui.app.create_engine", return_value=connection):
            self.client = create_app().test_client()

    def browse(self, entity, **params):
        response = self.client.get("/api/browse", query_string={"entity": entity, **params},
                                   follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        return response.get_json()

    def test_frontend_accepts_serialized_records_and_list(self):
        responses = [self.browse("Docs"), self.browse("Issues"), self.browse("Issues", id="t"),
                     self.browse("Reports")]
        self.assertIsNone(responses[1]["record"])
        self.assertEqual(responses[1]["items"][0]["summary"], ["Open", None])
        for response in (responses[0], responses[3]):
            self.assertIsNone(response["items"][0]["summary"])
        # Compile actual Flask JSON as fresh literals, including nulls and extra keys.
        fixture = self.temp / "responses.ts"
        fixture.write_text('import type { Browse } from "../frontend/src/api";\n'
                           + "\n".join(f"({json.dumps(body)}) satisfies Browse;" for body in responses))
        subprocess.run([ROOT / "node_modules/.bin/tsc", "--noEmit", "--strict", "--skipLibCheck",
                        "--module", "preserve", "--target", "ES2022", fixture], check=True)

    def test_ticket_update_rejects_stale_values(self):
        csrf = self.client.get("/api/config").get_json()["csrf"]
        update = {"csrf": csrf, "previous_status": "Open", "previous_assignee": "",
                  "status": "Done", "assignee": "Sam"}
        url = "/api/ticket?entity=Issues&id=t"
        self.assertEqual(self.client.post(url, data={**update, "csrf": ""}).status_code, 403)
        self.assertEqual(self.client.post(url, data={**update, "status": "unknown"}).status_code, 400)
        self.assertEqual(self.client.post(url, data=update).status_code, 200)
        self.assertEqual(self.client.post(url, data=update).status_code, 409)
        self.assertEqual(self.browse("Issues")["items"][0]["summary"], ["Done", "Sam"])
