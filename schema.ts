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
