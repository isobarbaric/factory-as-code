import type { Entity } from "./entity";
import type { Integration } from "./integration";

export interface ProcessConfig {
  entities: readonly Entity[];
  integrations?: readonly Integration[];
  automations?: { root: string };
  skills?: { root: string };
}
