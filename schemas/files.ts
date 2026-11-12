import type { JsonObject } from "./json";

export interface Files {
  repo_name: string;
  files_id: string;
  entity_name: string;
  object_prefix: string;
  metadata?: JsonObject;
}
