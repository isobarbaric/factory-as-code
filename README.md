# Local setup

Install Make and uv, then run `make setup`. It installs the Python MCP server dependencies, creates the SQLite tables in `.local/records.db`, and initializes an empty repository registry at `.local/repos.json`. Repeating setup preserves records and registrations.

Register each project you want the local agent to access with its stable repo ID and an existing compiled JSON manifest. For example:

```sh
make register REPO_ID=my-project MANIFEST="../my-project/.process/dist/process.json"
```

Registration validates the manifest and saves its absolute path under the ID. Repeating the command with the same ID updates the path. Node.js is only needed if you want to build a manifest from TypeScript.

Run `make mcp-config` and copy the resulting JSON into your MCP client's configuration. The client launches the server over stdio and reads the registry at startup. Restart the connection after registering a project. Call `get_process` with the registered ID to read its manifest. Document and ticket lists start empty. `make mcp` is the manual stdio entrypoint.

Run `make test` to exercise the MCP client and server against a temporary SQLite database. For PostgreSQL, supply an empty disposable database via `TEST_DATABASE_URL`. See [MCP configuration](docs/mcp.md) for individual settings.
