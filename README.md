# Local setup

Install Make, Node.js with npm, and uv, then run `make setup` from the checkout. It installs locked dependencies, builds the repo manifest, initializes the three tables in `.local/records.db`, and registers the manifest in `.local/repos.json`. SQLite runs inside Python. Repeating setup preserves records.

Run `make mcp-config` and copy the resulting JSON into your MCP client's configuration. The client launches the server over stdio. Use `github:1454895720` for this repository or supply your own stable ID with `make setup REPO_ID=...`. Call `get_process` to read the manifest. Document and ticket lists start empty. `make mcp` is the manual stdio entrypoint.

Run `make test` to exercise the MCP client and server against a temporary SQLite database. For PostgreSQL, supply an empty disposable database via `TEST_DATABASE_URL`. See [MCP configuration](docs/mcp.md) for the individual settings.
