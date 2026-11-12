import type { JsonObject } from "./json";

export interface Files {
  repo_id: string;
  files_id: string;
  entity_name: string;
  object_prefix: string;
  metadata?: JsonObject;
}
