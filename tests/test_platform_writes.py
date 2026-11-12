"""Exercise the platform API's write routes against temporary SQLite."""

import json
import tempfile
import unittest
from pathlib import Path

from httpx import ASGITransport, AsyncClient
from sqlmodel import SQLModel, create_engine

from store.platform_api import create_app
from store.reader import FactoryReader
from store.writer import FactoryWriter, ticket_prefixes


class PlatformWritesTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        manifest = {
            "entities": [
                {"name": "Design Doc", "type": "document"},
                {"name": "Work Order", "type": "ticket", "statuses": ["Open", "Done"]},
                {"name": "Test Report", "type": "files"},
            ]
        }
        (root / "app" / ".factory" / "dist").mkdir(parents=True)
        path = root / "app" / ".factory" / "dist" / "factory.json"
        path.write_text(json.dumps(manifest))
        engine = create_engine(f"sqlite:///{root}/records.db")
        self.addCleanup(engine.dispose)
        SQLModel.metadata.create_all(engine)
        manifests = {"demo": path}
        app = create_app(FactoryReader(engine, manifests), FactoryWriter(engine, manifests))
        self.http = AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost")
        self.addAsyncCleanup(self.http.aclose)

    async def send(self, method, path, expected, **kwargs):
        params = {"repo_id": "demo", **kwargs.pop("params", {})}
        reply = await self.http.request(method, path, params=params, **kwargs)
        self.assertEqual(reply.status_code, expected, reply.text)
        return reply.json() if reply.content else None

    async def test_lists_repositories_by_folder(self):
        reply = await self.http.get("/api/repositories")
        self.assertEqual(reply.json(), [{"repo_id": "demo", "name": "app"}])

    async def test_document_lifecycle(self):
        created = await self.send(
            "POST", "/api/documents", 201,
            json={"entity_name": "Design Doc", "title": "  Auth flow ", "content": "# Auth"},
        )
        doc_id = created["document_id"]
        self.assertTrue(doc_id.startswith("auth-flow-"))
        self.assertEqual(created["title"], "Auth flow")
        updated = await self.send(
            "PATCH", f"/api/documents/{doc_id}", 200, json={"content": "Updated body"}
        )
        self.assertEqual((updated["title"], updated["content"]), ("Auth flow", "Updated body"))
        fetched = await self.send("GET", f"/api/documents/{doc_id}", 200)
        self.assertEqual(fetched["content"], "Updated body")
        await self.send("PATCH", f"/api/documents/{doc_id}", 422, json={"title": "   "})
        await self.send("DELETE", f"/api/documents/{doc_id}", 204)
        await self.send("GET", f"/api/documents/{doc_id}", 404)
        await self.send("DELETE", f"/api/documents/{doc_id}", 404)

    async def test_rejects_entities_the_factory_does_not_declare(self):
        await self.send(
            "POST", "/api/documents", 422, json={"entity_name": "Work Order", "title": "Nope"}
        )
        await self.send(
            "POST", "/api/tickets", 422, json={"entity_name": "Design Doc", "title": "Nope"}
        )

    async def test_ticket_lifecycle(self):
        first = await self.send(
            "POST", "/api/tickets", 201, json={"entity_name": "Work Order", "title": "Ship it"}
        )
        second = await self.send(
            "POST", "/api/tickets", 201,
            json={"entity_name": "Work Order", "title": "Then this", "assignee": "sam"},
        )
        self.assertEqual((first["ticket_id"], first["status"]), ("WO-1", "Open"))
        self.assertEqual((second["ticket_id"], second["assignee"]), ("WO-2", "sam"))
        moved = await self.send(
            "PATCH", "/api/tickets/WO-1", 200,
            json={"status": "Done", "assignee": "alex", "description": "Notes"},
        )
        self.assertEqual(
            (moved["status"], moved["assignee"], moved["description"]), ("Done", "alex", "Notes")
        )
        await self.send("PATCH", "/api/tickets/WO-1", 422, json={"status": "Shipped"})
        cleared = await self.send("PATCH", "/api/tickets/WO-1", 200, json={"assignee": None})
        self.assertIsNone(cleared["assignee"])
        self.assertEqual(cleared["status"], "Done")
        listed = await self.send("GET", "/api/tickets", 200, params={"status": "Done"})
        self.assertEqual([t["ticket_id"] for t in listed["items"]], ["WO-1"])
        await self.send("DELETE", "/api/tickets/WO-1", 204)
        third = await self.send(
            "POST", "/api/tickets", 201, json={"entity_name": "Work Order", "title": "Next"}
        )
        self.assertEqual(third["ticket_id"], "WO-3")

    async def test_comment_threads(self):
        await self.send(
            "POST", "/api/tickets", 201, json={"entity_name": "Work Order", "title": "Ship it"}
        )
        target = {"target_type": "ticket", "target_id": "WO-1"}
        await self.send(
            "POST", "/api/comments", 404,
            json={"target_type": "ticket", "target_id": "WO-9", "author": "sam", "body": "Hi"},
        )
        await self.send("POST", "/api/comments", 422, json={**target, "author": "sam", "body": " "})
        first = await self.send(
            "POST", "/api/comments", 201, json={**target, "author": "sam", "body": "Looks good"}
        )
        await self.send(
            "POST", "/api/comments", 201, json={**target, "author": "alex", "body": "Agreed"}
        )
        resolved = await self.send(
            "PATCH", f"/api/comments/{first['comment_id']}", 200, json={"resolved": True}
        )
        self.assertTrue(resolved["resolved"])
        thread = await self.send("GET", "/api/comments", 200, params=target)
        self.assertEqual([(c["author"], c["resolved"]) for c in thread], [("sam", True), ("alex", False)])
        await self.send("DELETE", f"/api/comments/{first['comment_id']}", 204)
        self.assertEqual(len(await self.send("GET", "/api/comments", 200, params=target)), 1)
        await self.send("DELETE", "/api/tickets/WO-1", 204)
        self.assertEqual(await self.send("GET", "/api/comments", 200, params=target), [])

    async def test_unregistered_repository_is_hidden(self):
        reply = await self.http.post(
            "/api/tickets",
            params={"repo_id": "other"},
            json={"entity_name": "Work Order", "title": "Sneaky"},
        )
        self.assertEqual(reply.status_code, 404)


class TicketPrefixTest(unittest.TestCase):
    def test_prefixes_stay_unique(self):
        self.assertEqual(
            ticket_prefixes(["Work Order", "Pull Request", "Process Rule"]),
            {"Work Order": "WO", "Pull Request": "PR", "Process Rule": "PRU"},
        )
