import { EntityType, type ProcessConfig } from "../schema";

export default {
  entities: [
    { name: "Blueprint", type: EntityType.Document },
    { name: "Work Order", type: EntityType.Ticket },
    { name: "Test Report", type: EntityType.Files },
  ],
} satisfies ProcessConfig;
