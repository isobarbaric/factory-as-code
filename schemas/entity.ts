export enum EntityType {
  Document = "document",
  Ticket = "ticket",
  Files = "files",
}

export interface Entity {
  name: string;
  type: EntityType;
}
