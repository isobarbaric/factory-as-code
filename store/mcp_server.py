"""Read process records over MCP stdio."""

from mcp.server.fastmcp import FastMCP

from .reader import ProcessReader, configured_reader


def create_server(reader: ProcessReader):
    server = FastMCP("Process records")
    server.tool()(reader.get_process)
    server.tool()(reader.list_documents)
    server.tool()(reader.get_document)
    server.tool()(reader.list_tickets)
    server.tool()(reader.get_ticket)
    return server


def main():
    create_server(configured_reader()).run(transport="stdio")


if __name__ == "__main__":
    main()
