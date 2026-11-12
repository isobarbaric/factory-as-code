import type { JsonObject } from "./json";

export interface Document {
  repo_id: string;
  document_id: string;
  entity_name: string;
  content: string;
  metadata: JsonObject;
}
