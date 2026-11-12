import { EntityType, type FactoryConfig } from "@factory-as-code/factory-config";

export default {
  entities: [
    { name: "Blueprint", type: EntityType.Document },
    { name: "Work Order", type: EntityType.Ticket, statuses: ["Open", "In progress", "Done"] },
    { name: "Test Report", type: EntityType.Files },
  ],
} satisfies FactoryConfig;
