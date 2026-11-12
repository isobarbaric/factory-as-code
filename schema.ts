export enum EntityType {
  Document = "document",
  Ticket = "ticket",
  Files = "files",
}

export interface Entity {
  name: string;
  type: EntityType;
}

export interface ProcessConfig {
  artifact: {
    entities: readonly Entity[];
  };
  automations?: { root: string };
  skills?: { root: string };
}
