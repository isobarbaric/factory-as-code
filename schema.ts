export enum EntityType {
  Document = "document",
  Ticket = "ticket",
  Files = "files",
}

export enum Integration {
  Gmail = "gmail",
  GoogleDrive = "googledrive",
  Outlook = "outlook",
  GoogleSheets = "googlesheets",
  Supabase = "supabase",
  Notion = "notion",
  Slack = "slack",
  Airtable = "airtable",
  GoogleDocs = "googledocs",
  HubSpot = "hubspot",
}

export interface Entity {
  name: string;
  type: EntityType;
}

export interface ProcessConfig {
  entities: readonly Entity[];
  integrations?: readonly Integration[];
  automations?: { root: string };
  skills?: { root: string };
}

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface DocumentRevision {
  repo_name: string;
  document_id: string;
  entity_name: string;
  version_number: number;
  content: string;
  metadata: JsonObject;
}

export interface Ticket {
  repo_name: string;
  ticket_id: string;
  entity_name: string;
  title: string;
  description: string;
  status: string;
  assignee: string | null;
  metadata?: JsonObject;
}
