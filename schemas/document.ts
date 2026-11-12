import type { JsonObject } from "./json";

export interface Document {
  repo_name: string;
  document_id: string;
  entity_name: string;
  version_number: number;
  title: string;
  content: string;
  metadata: JsonObject;
}
