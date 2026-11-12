"""Run against an empty disposable PostgreSQL database via TEST_DATABASE_URL."""

import asyncio
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from sqlmodel import Session, SQLModel, create_engine

from store import Document, Ticket


@unittest.skipUnless(
    os.environ.get("TEST_DATABASE_URL"), "requires a disposable PostgreSQL database"
)
class ReadToolsTest(unittest.TestCase):
    def test_local_agent(self):
        asyncio.run(self.exercise())

    async def exercise(self):
        url = os.environ["TEST_DATABASE_URL"]
        engine = create_engine(url)
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            for repo in ("allowed", "hidden"):
                session.add(
                    Document(
                        repo_id=repo, document_id="1", entity_name="Plan", content=repo
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
                    {"name": "Bug", "type": "ticket"},
                    {"name": "Plan", "type": "document"},
                ]
            }
            (root / "manifest.json").write_text(json.dumps(manifest))
            config = root / "repos.json"
            config.write_text(json.dumps({"allowed": "manifest.json"}))
            params = StdioServerParameters(
                command=sys.executable,
                args=["-m", "store.mcp_server"],
                env={"DATABASE_URL": url, "PROCESS_REPOS": str(config)},
            )
            async with (
                stdio_client(params) as streams,
                ClientSession(*streams) as client,
            ):
                await client.initialize()
                tools = {tool.name: tool for tool in (await client.list_tools()).tools}
                names = set(tools)
                for name, required in {
                    "get_process": {"entities"},
                    "list_documents": {"items", "next_cursor"},
                    "get_document": {
                        "repo_id",
                        "document_id",
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
                }.items():
                    self.assertEqual(
                        set(tools[name].outputSchema["required"]), required
                    )
                for name, id_field in [
                    ("list_documents", "document_id"),
                    ("list_tickets", "ticket_id"),
                ]:
                    schema = tools[name].outputSchema
                    item_ref = schema["properties"]["items"]["items"]["$ref"]
                    self.assertIn(
                        id_field, schema["$defs"][item_ref.split("/")[-1]]["required"]
                    )
                self.assertEqual(
                    names,
                    {
                        "get_process",
                        "get_document",
                        "list_documents",
                        "get_ticket",
                        "list_tickets",
                    },
                )

                async def call(tool, **kwargs):
                    result = await client.call_tool(
                        tool, {"repo_id": "allowed", **kwargs}
                    )
                    self.assertFalse(result.isError, result.content)
                    return result.structuredContent

                self.assertEqual(await call("get_process"), manifest)
                self.assertEqual(
                    (await call("get_document", document_id="1"))["content"],
                    "allowed",
                )
                docs = await call("list_documents", entity_name="Plan")
                self.assertEqual(
                    docs["items"],
                    [{"document_id": "1", "entity_name": "Plan"}],
                )
                self.assertEqual(
                    (await call("get_ticket", ticket_id="1"))["title"], "allowed"
                )
                first = await call(
                    "list_tickets", status="open", entity_name="Bug", assignee="alice"
                )
                second = await call("list_tickets", cursor=first["next_cursor"])
                tickets = first["items"] + second["items"]
                self.assertEqual(len(tickets), 51)
                self.assertEqual(
                    {r["ticket_id"] for r in tickets}, {str(i) for i in range(51)}
                )
                self.assertEqual({r["title"] for r in tickets}, {"allowed"})
                self.assertIsNone(second["next_cursor"])
                self.assertFalse((await call("list_tickets", status="closed"))["items"])
                for tool in names:
                    args = {"repo_id": "hidden"}
                    if tool == "get_document":
                        args["document_id"] = "1"
                    if tool == "get_ticket":
                        args["ticket_id"] = "1"
                    self.assertTrue((await client.call_tool(tool, args)).isError)
