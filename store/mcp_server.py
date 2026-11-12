"""Read factory records over MCP stdio."""

from mcp.server.fastmcp import FastMCP

from .reader import FactoryReader, configured_reader


def create_server(reader: FactoryReader) -> FastMCP:
    server = FastMCP("Factory records")
    server.add_tool(reader.get_factory)
    server.add_tool(reader.list_documents)
    server.add_tool(reader.get_document)
    server.add_tool(reader.list_tickets)
    server.add_tool(reader.get_ticket)
    return server


def main():
    create_server(configured_reader()).run(transport="stdio")


if __name__ == "__main__":
    main()
