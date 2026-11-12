import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CommentTarget, Document, Ticket } from "@factory-as-code/factory-records";
import { api, type TicketSummary } from "./api";

export const keys = {
  repositories: ["repositories"] as const,
  factory: (repo: string) => ["factory", repo] as const,
  documents: (repo: string, entity: string) => ["documents", repo, entity] as const,
  document: (repo: string, id: string) => ["document", repo, id] as const,
  tickets: (repo: string) => ["tickets", repo] as const,
  ticket: (repo: string, id: string) => ["ticket", repo, id] as const,
  comments: (repo: string, target: CommentTarget, id: string) =>
    ["comments", repo, target, id] as const,
};

export function useRepositories() {
  return useQuery({ queryKey: keys.repositories, queryFn: api.repositories });
}

export function useFactory(repo: string | undefined) {
  return useQuery({
    queryKey: keys.factory(repo ?? ""),
    queryFn: () => api.factory(repo!),
    enabled: !!repo,
  });
}

export function useDocuments(repo: string, entity: string) {
  return useQuery({
    queryKey: keys.documents(repo, entity),
    queryFn: () => api.documents(repo, entity),
  });
}

export function useDocument(repo: string, id: string | undefined) {
  return useQuery({
    queryKey: keys.document(repo, id ?? ""),
    queryFn: () => api.document(repo, id!),
    enabled: !!id,
    staleTime: Infinity,
  });
}

/** Every ticket in the repository; entity views filter client-side. */
export function useTickets(repo: string) {
  return useQuery({ queryKey: keys.tickets(repo), queryFn: () => api.tickets(repo) });
}

export function useTicket(repo: string, id: string | undefined) {
  return useQuery({
    queryKey: keys.ticket(repo, id ?? ""),
    queryFn: () => api.ticket(repo, id!),
    enabled: !!id,
  });
}

export function useComments(repo: string, target: CommentTarget, id: string) {
  return useQuery({
    queryKey: keys.comments(repo, target, id),
    queryFn: () => api.comments(repo, target, id),
  });
}

export function useCreateDocument(repo: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { entity_name: string; title: string }) => api.createDocument(repo, body),
    onSuccess: (document) => {
      client.setQueryData(keys.document(repo, document.document_id), document);
      client.invalidateQueries({ queryKey: keys.documents(repo, document.entity_name) });
    },
  });
}

export function useUpdateDocument(repo: string, id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { title?: string; content?: string }) => api.updateDocument(repo, id, body),
    onSuccess: (document: Document, body) => {
      client.setQueryData(keys.document(repo, id), document);
      if (body.title !== undefined) {
        client.invalidateQueries({ queryKey: keys.documents(repo, document.entity_name) });
      }
    },
  });
}

export function useDeleteDocument(repo: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (document: { document_id: string; entity_name: string }) =>
      api.deleteDocument(repo, document.document_id),
    onSuccess: (_, document) => {
      client.removeQueries({ queryKey: keys.document(repo, document.document_id) });
      client.invalidateQueries({ queryKey: keys.documents(repo, document.entity_name) });
    },
  });
}

function patchTicketList(client: ReturnType<typeof useQueryClient>, repo: string, ticket: Ticket) {
  client.setQueryData<TicketSummary[]>(keys.tickets(repo), (list) =>
    list?.map((item) =>
      item.ticket_id === ticket.ticket_id
        ? {
            ticket_id: ticket.ticket_id,
            entity_name: ticket.entity_name,
            title: ticket.title,
            status: ticket.status,
            assignee: ticket.assignee,
          }
        : item,
    ),
  );
}

export function useCreateTicket(repo: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.createTicket>[1]) => api.createTicket(repo, body),
    onSuccess: (ticket) => {
      client.setQueryData(keys.ticket(repo, ticket.ticket_id), ticket);
      client.invalidateQueries({ queryKey: keys.tickets(repo) });
    },
  });
}

export function useUpdateTicket(repo: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Parameters<typeof api.updateTicket>[2]) =>
      api.updateTicket(repo, id, body),
    onMutate: async ({ id, ...body }) => {
      await client.cancelQueries({ queryKey: keys.tickets(repo) });
      const previous = client.getQueryData<TicketSummary[]>(keys.tickets(repo));
      client.setQueryData<TicketSummary[]>(keys.tickets(repo), (list) =>
        list?.map((item) => (item.ticket_id === id ? { ...item, ...body } : item)),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(keys.tickets(repo), context.previous);
    },
    onSuccess: (ticket) => {
      client.setQueryData(keys.ticket(repo, ticket.ticket_id), ticket);
      patchTicketList(client, repo, ticket);
    },
  });
}

export function useDeleteTicket(repo: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTicket(repo, id),
    onSuccess: (_, id) => {
      client.removeQueries({ queryKey: keys.ticket(repo, id) });
      client.setQueryData<TicketSummary[]>(keys.tickets(repo), (list) =>
        list?.filter((item) => item.ticket_id !== id),
      );
    },
  });
}

export function useCommentMutations(repo: string, target: CommentTarget, id: string) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: keys.comments(repo, target, id) });
  return {
    create: useMutation({
      mutationFn: (body: { author: string; body: string }) =>
        api.createComment(repo, { target_type: target, target_id: id, ...body }),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ comment_id, ...body }: { comment_id: string; resolved?: boolean; body?: string }) =>
        api.updateComment(repo, comment_id, body),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (comment_id: string) => api.deleteComment(repo, comment_id),
      onSuccess: refresh,
    }),
  };
}
