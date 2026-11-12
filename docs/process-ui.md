Run `npm ci` and `npm run ui:dev` from the repository root to open the React preview. It reads the sidebar and settings from `.process/process.ts` and displays bundled sample records. Run `npm run ui:build` to produce the static frontend.

For live records, configure the local agent to launch the [MCP server](mcp.md). The browser preview runs independently of the agent.

Start the local platform API with `make api` after running `make setup` and registering a repository. The API uses the same database, repository allowlist, response models, and pagination as MCP. Its five GET routes are listed at <http://127.0.0.1:8000/docs>. Pass the registered ID as the `repo_id` query parameter on each request, for example `GET /api/tickets?repo_id=github:12345&status=Open`. This listener is for the trusted local machine. A shared deployment needs per-client authorization.
