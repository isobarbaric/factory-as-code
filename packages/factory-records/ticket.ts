import type { JsonObject } from "./json";

export interface Ticket {
  repo_id: string;
  ticket_id: string;
  entity_name: string;
  title: string;
  description: string;
  status: string;
  assignee: string | null;
  metadata?: JsonObject;
}
