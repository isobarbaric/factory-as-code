# Process as Code

The CLI builds a project's `.process/process.ts` into a validated JSON manifest.

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
