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
