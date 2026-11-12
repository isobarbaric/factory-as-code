# Factory as Code

When someone joins a project, how do they know where to write up a design, what to call the ticket that tracks the work, or which statuses that ticket can have? Factory as Code lets a team answer those questions once in its repository. People and tools can read the same description, and the team can review changes to it alongside the code.

Each project describes how it works in `.factory/factory.ts`. For example, a team might write its designs as **Blueprints**, track implementation with **Work Orders**, and collect test results in **Test Reports**. Here’s how this repository defines those three kinds of work:

```ts
import { EntityType, type FactoryConfig } from "@factory-as-code/factory-config";

export default {
  entities: [
    { name: "Blueprint", type: EntityType.Document },
    {
      name: "Work Order",
      type: EntityType.Ticket,
      statuses: ["Open", "In progress", "Done"],
    },
    { name: "Test Report", type: EntityType.Files },
  ],
} satisfies FactoryConfig;
```

Each entry defines an entity the team can create many times. Every work order, for example, has its own title and assignee and uses one of the statuses above. Teams choose their own names and ticket statuses. They can also list the integrations they use and point to the directories where they keep skills and automations.

## Local CLI

Run `npm ci` and `make setup` from this checkout once. From a project containing
`.factory/factory.ts`, the `factory` CLI accepts four commands.

| Command | Effect |
| --- | --- |
| `factory build` | Type-check and validate the config, then publish `.factory/dist/factory.json`. |
| `factory connect --repo-id <id>` | Register the existing compiled manifest under a stable ID. |
| `factory apply --repo-id <id>` | Build the config and then register it under that ID. |
| `factory status --repo-id <id>` | Check the local registry. Exit 0 for registered, 1 for absent, or 2 for an error. |

From this checkout, run `make apply REPO_ID=org:example PROJECT_DIR=/path/to/project`.
The project directory defaults to the current checkout. Registration updates the
ID-to-manifest mapping in `.local/repos.json`. Restart the API and any MCP
connections after adding an ID or changing its path. Rebuilding at an already
registered path makes the new manifest available on the next factory read.
