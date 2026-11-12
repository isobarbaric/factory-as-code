# Process as Code

The CLI builds a project's `.process/process.ts` into a validated JSON manifest.

## Local setup

Install Make and uv, then run `make setup`. It installs the Python MCP server dependencies, creates the SQLite tables in `.local/records.db`, and initializes an empty repository registry at `.local/repos.json`. Repeating setup preserves records and registrations.

Register each project you want the local agent to access with its stable repo ID and an existing compiled JSON manifest. For example:

```sh
make register REPO_ID=my-project MANIFEST="../my-project/.process/dist/process.json"
```

Registration validates the manifest and saves its absolute path under the ID. Repeating the command with the same ID updates the path. The Make target works without Node.js.

With the Node CLI installed from this checkout (`npm link`), you can also register directly from the project root:

```sh
process connect --repo-id local:process-demo
```

The argument is the stable ID used in MCP queries and database rows. The CLI reads the project's `.process/dist/process.json` and registers it with the local store configured by this checkout.

Run `make mcp-config` and copy the resulting JSON into your MCP client's configuration. The client launches the server over stdio and reads the registry at startup. Restart the connection after registering a project. Call `get_process` with the registered ID to read its manifest. Document and ticket lists start empty. `make mcp` is the manual stdio entrypoint.

Run `make test` to exercise the MCP client and server against a temporary SQLite database. For PostgreSQL, supply an empty disposable database via `TEST_DATABASE_URL`. See [MCP configuration](docs/mcp.md) for individual settings.

## Build another project's manifest

From the root of your local `process-as-code` checkout, install the CLI dependencies once and save the checkout path for this shell session.

```sh
npm ci
PROCESS_CLI_ROOT="$(pwd)"
```

Change into the project that owns the config and run the CLI from there. Replace the example path with the target project's root.

```sh
cd /path/to/your-project
node "$PROCESS_CLI_ROOT/scripts/process.cjs" build
```

The CLI reads `.process/process.ts` and writes `.process/dist/process.json` **in the target project**. It executes the config and its imports with your user permissions. Use a trusted checkout or run the build in an isolated environment.

The config must default-export a value that satisfies `ProcessConfig`, and its imports must resolve from the config file. For example, if `your-project/` and `process-as-code/` are sibling directories, this works in `your-project/.process/process.ts`:

```ts
import { EntityType, type ProcessConfig } from "../../process-as-code/schemas";

export default {
  entities: [
    { name: "Bug", type: EntityType.Ticket, statuses: ["Open", "Done"] },
  ],
} satisfies ProcessConfig;
```

Adjust the schema import if your checkouts live elsewhere. Any declared `skills.root` or `automations.root` directory is resolved relative to the target project's `.process/` directory.
