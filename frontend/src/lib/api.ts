import type { FactoryConfig } from "@factory-as-code/factory-config";
import type { Comment, CommentTarget, Document, Ticket } from "@factory-as-code/factory-records";

export interface Repository {
  repo_id: string;
  name: string;
}

export type DocumentSummary = Pick<Document, "document_id" | "entity_name" | "title">;
export type TicketSummary = Pick<
  Ticket,
  "ticket_id" | "entity_name" | "title" | "status" | "assignee"
>;

interface Page<Item> {
  items: Item[];
  next_cursor: string | null;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(
  method: string,
  path: string,
  params: Record<string, string | undefined>,
  body?: unknown,
): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, value);
  }
  const response = await fetch(`${path}?${query}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const payload = await response.json();
      detail = typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail);
    } catch {
      // Keep the status text.
    }
    throw new ApiError(response.status, detail);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

async function allPages<Item>(path: string, params: Record<string, string | undefined>) {
  const items: Item[] = [];
  let cursor: string | undefined;
  do {
    const page = await request<Page<Item>>("GET", path, { ...params, cursor });
    items.push(...page.items);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return items;
}

const id = encodeURIComponent;

export const api = {
  repositories: () => request<Repository[]>("GET", "/api/repositories", {}),
  factory: (repo_id: string) => request<FactoryConfig>("GET", "/api/factory", { repo_id }),

  documents: (repo_id: string, entity_name: string) =>
    allPages<DocumentSummary>("/api/documents", { repo_id, entity_name }),
  document: (repo_id: string, document_id: string) =>
    request<Document>("GET", `/api/documents/${id(document_id)}`, { repo_id }),
  createDocument: (
    repo_id: string,
    body: { entity_name: string; title: string; content?: string },
  ) => request<Document>("POST", "/api/documents", { repo_id }, body),
  updateDocument: (
    repo_id: string,
    document_id: string,
    body: { title?: string; content?: string },
  ) => request<Document>("PATCH", `/api/documents/${id(document_id)}`, { repo_id }, body),
  deleteDocument: (repo_id: string, document_id: string) =>
    request<void>("DELETE", `/api/documents/${id(document_id)}`, { repo_id }),

  tickets: (repo_id: string, entity_name?: string) =>
    allPages<TicketSummary>("/api/tickets", { repo_id, entity_name }),
  ticket: (repo_id: string, ticket_id: string) =>
    request<Ticket>("GET", `/api/tickets/${id(ticket_id)}`, { repo_id }),
  createTicket: (
    repo_id: string,
    body: {
      entity_name: string;
      title: string;
      description?: string;
      status?: string;
      assignee?: string | null;
    },
  ) => request<Ticket>("POST", "/api/tickets", { repo_id }, body),
  updateTicket: (
    repo_id: string,
    ticket_id: string,
    body: { title?: string; description?: string; status?: string; assignee?: string | null },
  ) => request<Ticket>("PATCH", `/api/tickets/${id(ticket_id)}`, { repo_id }, body),
  deleteTicket: (repo_id: string, ticket_id: string) =>
    request<void>("DELETE", `/api/tickets/${id(ticket_id)}`, { repo_id }),

  comments: (repo_id: string, target_type: CommentTarget, target_id: string) =>
    request<Comment[]>("GET", "/api/comments", { repo_id, target_type, target_id }),
  createComment: (
    repo_id: string,
    body: { target_type: CommentTarget; target_id: string; author: string; body: string },
  ) => request<Comment>("POST", "/api/comments", { repo_id }, body),
  updateComment: (
    repo_id: string,
    comment_id: string,
    body: { body?: string; resolved?: boolean },
  ) => request<Comment>("PATCH", `/api/comments/${id(comment_id)}`, { repo_id }, body),
  deleteComment: (repo_id: string, comment_id: string) =>
    request<void>("DELETE", `/api/comments/${id(comment_id)}`, { repo_id }),
};
