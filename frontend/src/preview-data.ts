import type { Document, Ticket } from "../../schemas";

export const documents: Document[] = [
  {
    repo_id: "example",
    document_id: "release",
    entity_name: "Blueprint",
    title: "Release checklist",
    content:
      "Verify the build and smoke-test the release candidate before rollout.",
    metadata: {},
  },
];

export const tickets: Ticket[] = [
  {
    repo_id: "example",
    ticket_id: "WO-101",
    entity_name: "Work Order",
    title: "Verify the release candidate",
    description: "Run the smoke tests and record the results.",
    status: "Open",
    assignee: null,
  },
];
