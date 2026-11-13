"""Exercise each platform read endpoint through an MCP subprocess."""

import json
import sys
import tempfile
import unittest
from contextlib import asynccontextmanager
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from sqlmodel import Session, SQLModel, create_engine

from store import Document, Ticket


class PlatformEndpointsTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.manifest = {
            "entities": [
                {"name": "Guide", "type": "document"},
                {"name": "Note", "type": "document"},
                {"name": "Task", "type": "ticket", "statuses": ["Open", "Done"]},
                {"name": "Bug", "type": "ticket", "statuses": ["Open"]},
            ],
            "integrations": ["github"],
            "skills": {"root": "skills"},
        }
        self.manifest_path = self.root / "factory.json"
        self.manifest_path.write_text(json.dumps(self.manifest))
        registry = self.root / "repos.json"
        registry.write_text(json.dumps({"demo": "factory.json"}))
        url = f"sqlite:///{self.root}/records.db"
        self.engine = create_engine(url)
        self.addCleanup(self.engine.dispose)
        SQLModel.metadata.create_all(self.engine)
        self.params = StdioServerParameters(
            command=sys.executable,
            args=["-m", "store.mcp_server"],
            env={"DATABASE_URL": url, "FACTORY_REPOS": str(registry)},
        )

    @asynccontextmanager
    async def client(self):
        async with (
            stdio_client(self.params) as streams,
            ClientSession(*streams) as client,
        ):
            await client.initialize()
            yield client

    async def call(self, client, tool, **args):
        reply = await client.call_tool(tool, {"repo_id": "demo", **args})
        self.assertFalse(reply.isError, reply.content)
        return reply.structuredContent

    async def test_get_factory(self):
        async with self.client() as client:
            self.assertEqual(await self.call(client, "get_factory"), self.manifest)
            self.manifest_path.write_text(
                '{"entities": [{"name": "Task", "type": "ticket"}]}'
            )
            reply = await client.call_tool("get_factory", {"repo_id": "demo"})
            self.assertTrue(reply.isError)

    async def test_get_document(self):
        metadata = {"labels": ["setup"], "reviewed": False}
        with Session(self.engine) as db:
            db.add(
                Document(
                    repo_id="demo",
                    document_id="d1",
                    title="Setup",
                    entity_name="Guide",
                    content="Install the app.",
                    metadata_=metadata,
                )
            )
            db.commit()
        async with self.client() as client:
            self.assertEqual(
                await self.call(client, "get_document", document_id="d1"),
                {
                    "repo_id": "demo",
                    "document_id": "d1",
                    "entity_name": "Guide",
                    "title": "Setup",
                    "content": "Install the app.",
                    "metadata": metadata,
                },
            )
            reply = await client.call_tool(
                "get_document", {"repo_id": "demo", "document_id": "missing"}
            )
            self.assertTrue(reply.isError)
            self.assertIn("Record not found", reply.content[0].text)

    async def test_list_documents(self):
        ids = [f"d{i:02}" for i in range(51)]
        with Session(self.engine) as db:
            for doc_id in reversed(ids):
                db.add(
                    Document(
                        repo_id="demo",
                        document_id=doc_id,
                        entity_name="Guide",
                        title=doc_id,
                        content="Full text",
                    )
                )
            db.add(
                Document(
                    repo_id="demo",
                    document_id="d00-extra",
                    entity_name="Note",
                    title="Other",
                    content="Other text",
                )
            )
            db.commit()
        async with self.client() as client:
            first = await self.call(client, "list_documents", entity_name="Guide")
            self.assertEqual(first["next_cursor"], ids[49])
            second = await self.call(
                client,
                "list_documents",
                entity_name="Guide",
                cursor=first["next_cursor"],
            )
            expected = [
                {"document_id": key, "entity_name": "Guide", "title": key}
                for key in ids
            ]
            self.assertEqual(first["items"], expected[:50])
            self.assertEqual(second, {"items": expected[50:], "next_cursor": None})

    async def test_get_ticket(self):
        with Session(self.engine) as db:
            db.add(
                Ticket(
                    repo_id="demo",
                    ticket_id="t1",
                    entity_name="Task",
                    title="Draft",
                    status="Open",
                    description="Write a guide.",
                )
            )
            db.commit()
        async with self.client() as client:
            self.assertEqual(
                await self.call(client, "get_ticket", ticket_id="t1"),
                {
                    "repo_id": "demo",
                    "ticket_id": "t1",
                    "entity_name": "Task",
                    "title": "Draft",
                    "status": "Open",
                    "description": "Write a guide.",
                    "metadata": None,
                    "assignee": None,
                },
            )
            reply = await client.call_tool(
                "get_ticket", {"repo_id": "demo", "ticket_id": "missing"}
            )
            self.assertTrue(reply.isError)
            self.assertIn("Record not found", reply.content[0].text)

    async def test_list_tickets(self):
        rows = [
            ("t1", "Task", "Open", "alice"),
            ("t2", "Bug", "Open", "alice"),
            ("t3", "Task", "Done", "alice"),
            ("t4", "Task", "Open", "bob"),
        ]
        with Session(self.engine) as db:
            for key, entity, status, assignee in rows:
                db.add(
                    Ticket(
                        repo_id="demo",
                        ticket_id=key,
                        entity_name=entity,
                        title=key,
                        status=status,
                        assignee=assignee,
                        description="Full text",
                    )
                )
            db.commit()
        async with self.client() as client:
            result = await self.call(
                client,
                "list_tickets",
                entity_name="Task",
                status="Open",
                assignee="alice",
            )
            self.assertEqual(
                result,
                {
                    "next_cursor": None,
                    "items": [
                        {
                            "ticket_id": "t1",
                            "title": "t1",
                            "entity_name": "Task",
                            "status": "Open",
                            "assignee": "alice",
                        }
                    ],
                },
            )
