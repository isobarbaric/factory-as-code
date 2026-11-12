export enum EntityType {
  Document = "document",
  Ticket = "ticket",
  Files = "files",
}

export type Entity =
  | { name: string; type: EntityType.Document | EntityType.Files; statuses?: never }
  | { name: string; type: EntityType.Ticket; statuses: readonly [string, ...string[]] };
