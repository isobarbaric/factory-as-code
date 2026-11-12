"""Use temporary SQLite by default, or an empty database specified by TEST_DATABASE_URL."""

import asyncio
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

from httpx import ASGITransport, AsyncClient
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from sqlmodel import Session, SQLModel, create_engine

from store import Document, Ticket
from store.platform_api import create_app
from store.reader import FactoryReader
from store.writer import FactoryWriter

ROUTES = {
    "get_factory": "/api/factory",
    "list_documents": "/api/documents",
    "get_document": "/api/documents/{document_id}",
    "list_tickets": "/api/tickets",
    "get_ticket": "/api/tickets/{ticket_id}",
}


async def request(http, tool, **params):
    path = ROUTES[tool].format(**params)
    query = {k: v for k, v in params.items() if k not in ("document_id", "ticket_id")}
    return await http.get(path, params=query)


class ReadToolsTest(unittest.TestCase):
    def test_local_agent(self):
        with tempfile.TemporaryDirectory() as temp:
            url = os.environ.get("TEST_DATABASE_URL", f"sqlite:///{temp}/records.db")
            asyncio.run(self.exercise(url))

    async def exercise(self, url):
        engine = create_engine(url)
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            for repo in ("allowed", "hidden"):
                session.add(
                    Document(
                        repo_id=repo,
                        document_id="1",
                        entity_name="Plan",
                        title="Plan title",
                        content=repo,
                    )
                )
                for i in range(51):
                    session.add(
                        Ticket(
                            repo_id=repo,
                            ticket_id=str(i),
                            entity_name="Bug",
                            title=repo,
                            description="",
                            status="open",
                            assignee="alice",
                        )
                    )
            session.commit()

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            manifest = {
                "entities": [
                    {"name": "Bug", "type": "ticket", "statuses": ["open", "closed"]},
                    {"name": "Plan", "type": "document"},
                ]
            }
            (root / "manifest.json").write_text(json.dumps(manifest))
            config = root / "repos.json"
            config.write_text(json.dumps({"allowed": "manifest.json"}))
            params = StdioServerParameters(
                command=sys.executable,
                args=["-m", "store.mcp_server"],
                env={"DATABASE_URL": url, "FACTORY_REPOS": str(config)},
            )
            manifests = {"allowed": root / "manifest.json"}
            app = create_app(
                FactoryReader(engine, manifests), FactoryWriter(engine, manifests)
            )
            async with (
                stdio_client(params) as streams,
                ClientSession(*streams) as client,
                AsyncClient(
                    transport=ASGITransport(app=app), base_url="http://localhost"
                ) as http,
            ):
                await client.initialize()
                tools = (await client.list_tools()).tools
                self.assert_tool_schemas({tool.name: tool for tool in tools})
                await self.assert_reads(client, http, manifest)
                await self.assert_errors(client, http)

    def assert_tool_schemas(self, tools):
        required_fields = {
            "get_factory": {"entities"},
            "list_documents": {"items", "next_cursor"},
            "get_document": {
                "repo_id",
                "document_id",
                "title",
                "entity_name",
                "content",
                "metadata",
            },
            "list_tickets": {"items", "next_cursor"},
            "get_ticket": {
                "repo_id",
                "ticket_id",
                "entity_name",
                "title",
                "description",
                "status",
                "assignee",
                "metadata",
            },
        }
        self.assertEqual(set(tools), set(required_fields))
        for name, required in required_fields.items():
            self.assertEqual(set(tools[name].outputSchema["required"]), required)
        for name, id_field in [
            ("list_documents", "document_id"),
            ("list_tickets", "ticket_id"),
        ]:
            schema = tools[name].outputSchema
            item_ref = schema["properties"]["items"]["items"]["$ref"]
            self.assertIn(
                id_field, schema["$defs"][item_ref.split("/")[-1]]["required"]
            )

    async def assert_reads(self, client, http, manifest):
        async def call(tool, **kwargs):
            result = await client.call_tool(tool, {"repo_id": "allowed", **kwargs})
            self.assertFalse(result.isError, result.content)
            response = await request(http, tool, repo_id="allowed", **kwargs)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json(), result.structuredContent)
            return result.structuredContent

        self.assertEqual(await call("get_factory"), manifest)
        self.assertEqual(
            (await call("get_document", document_id="1"))["content"],
            "allowed",
        )
        docs = await call("list_documents", entity_name="Plan")
        self.assertEqual(
            docs["items"],
            [{"document_id": "1", "entity_name": "Plan", "title": "Plan title"}],
        )
        self.assertEqual((await call("get_ticket", ticket_id="1"))["title"], "allowed")
        first = await call(
            "list_tickets", status="open", entity_name="Bug", assignee="alice"
        )
        second = await call("list_tickets", cursor=first["next_cursor"])
        tickets = first["items"] + second["items"]
        self.assertEqual(len(tickets), 51)
        self.assertEqual({r["ticket_id"] for r in tickets}, {str(i) for i in range(51)})
        self.assertEqual({r["title"] for r in tickets}, {"allowed"})
        self.assertIsNone(second["next_cursor"])
        self.assertFalse((await call("list_tickets", status="closed"))["items"])

    async def assert_errors(self, client, http):
        for tool in ROUTES:
            args = {"repo_id": "hidden"}
            if tool == "get_document":
                args["document_id"] = "1"
            if tool == "get_ticket":
                args["ticket_id"] = "1"
            self.assertTrue((await client.call_tool(tool, args)).isError)
            self.assertEqual((await request(http, tool, **args)).status_code, 404)
        for route in ("/api/documents/missing", "/api/tickets/missing"):
            self.assertEqual(
                (await http.get(route, params={"repo_id": "allowed"})).status_code, 404
            )
        self.assertEqual((await http.get("/api/tickets")).status_code, 422)
