import type { JsonObject } from "./json";

export interface DocumentRevision {
  repo_name: string;
  document_id: string;
  entity_name: string;
  version_number: number;
  content: string;
  metadata: JsonObject;
}
