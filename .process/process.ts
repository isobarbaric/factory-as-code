import { EntityType, type ProcessConfig } from "@process-as-code/process-config";

export default {
  entities: [
    { name: "Blueprint", type: EntityType.Document },
    { name: "Work Order", type: EntityType.Ticket, statuses: ["Open", "In progress", "Done"] },
    { name: "Test Report", type: EntityType.Files },
  ],
} satisfies ProcessConfig;
