"""Read process records over MCP stdio."""

from mcp.server.fastmcp import FastMCP

from .reader import ProcessReader, configured_reader


def create_server(reader: ProcessReader) -> FastMCP:
    server = FastMCP("Process records")
    server.add_tool(reader.get_process)
    server.add_tool(reader.list_documents)
    server.add_tool(reader.get_document)
    server.add_tool(reader.list_tickets)
    server.add_tool(reader.get_ticket)
    return server


def main():
    create_server(configured_reader()).run(transport="stdio")


if __name__ == "__main__":
    main()
