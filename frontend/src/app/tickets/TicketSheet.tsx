import type { Entity } from "@factory-as-code/factory-config";
import type { Ticket } from "@factory-as-code/factory-records";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Copy, MoreHorizontal, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import {
  EditorVariant,
  MarkdownEditorContent,
  useMarkdownEditor,
} from "@/components/MarkdownEditor";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import type { Repository } from "@/lib/api";
import { entityIcon } from "@/lib/entities";
import { useDeleteTicket, useTicket, useUpdateTicket } from "@/lib/queries";
import { CommentThread, ThreadLayout } from "../comments/CommentThread";
import { AssigneePicker, StatusMenu } from "./TicketFields";

const SAVE_DELAY_MS = 700;

export function TicketSheet({
  repo,
  entity,
  ticketId,
  people,
  onClose,
}: {
  repo: Repository;
  entity: Entity & { statuses: readonly string[] };
  ticketId: string;
  people: string[];
  onClose: () => void;
}) {
  const { data: ticket, isPending } = useTicket(repo.repo_id, ticketId);

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()} modal={false}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onInteractOutside={(event) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("[data-radix-popper-content-wrapper], [role=dialog]")) {
              event.preventDefault();
            }
          }}
          className="bg-card dark:bg-surface sofa-z-index-module-overlay fixed inset-y-0 right-0 flex w-[min(1040px,calc(100vw-15rem))] flex-col border-l shadow-md outline-none"
        >
          {isPending ? (
            <>
              <DialogPrimitive.Title className="sr-only">Loading {entity.name}</DialogPrimitive.Title>
              <div className="flex flex-col gap-4 p-8">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </>
          ) : ticket ? (
            <TicketDetail
              key={ticket.ticket_id}
              repo={repo}
              entity={entity}
              ticket={ticket}
              people={people}
              onClose={onClose}
            />
          ) : (
            <>
              <DialogPrimitive.Title className="sr-only">{entity.name} not found</DialogPrimitive.Title>
              <div className="flex justify-end p-2">
                <CloseButton onClose={onClose} />
              </div>
              <EmptyState
                icon={entityIcon(entity)}
                title={`${ticketId} Not Found`}
                description="It may have been deleted."
              />
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <Tooltip content="Close" side="bottom">
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground"
        aria-label="Close"
        onClick={onClose}
      >
        <X />
      </Button>
    </Tooltip>
  );
}

function TicketDetail({
  repo,
  entity,
  ticket,
  people,
  onClose,
}: {
  repo: Repository;
  entity: Entity & { statuses: readonly string[] };
  ticket: Ticket;
  people: string[];
  onClose: () => void;
}) {
  const update = useUpdateTicket(repo.repo_id);
  const remove = useDeleteTicket(repo.repo_id);
  const [title, setTitle] = useState(ticket.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pendingDescription = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const save = (body: Parameters<typeof update.mutate>[0], label: string) =>
    update.mutate(body, { onError: (error) => toast.error(`${label} not saved: ${error.message}`) });

  const flushDescription = () => {
    window.clearTimeout(timer.current);
    if (pendingDescription.current === null) return;
    const description = pendingDescription.current;
    pendingDescription.current = null;
    save({ id: ticket.ticket_id, description }, "Description");
  };
  const flushRef = useRef(flushDescription);
  flushRef.current = flushDescription;
  useEffect(() => () => flushRef.current(), []);

  const editor = useMarkdownEditor({
    value: ticket.description,
    placeholder: "Add a description…",
    onChange: (description) => {
      pendingDescription.current = description;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => flushRef.current(), SAVE_DELAY_MS);
    },
  });

  const commitTitle = () => {
    const next = title.trim();
    if (!next) setTitle(ticket.title);
    else if (next !== ticket.title) save({ id: ticket.ticket_id, title: next }, "Title");
  };

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <span className="ui-p2-flush text-muted-foreground">{entity.name}</span>
        <span className="ui-p2-flush text-subtle-foreground">/</span>
        <span className="ui-p2-flush font-mono text-foreground">{ticket.ticket_id}</span>
        <div className="flex-1" />
        <Tooltip content="Copy ID" side="bottom">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label="Copy ID"
            onClick={() => {
              void navigator.clipboard?.writeText(ticket.ticket_id);
              toast(`Copied ${ticket.ticket_id}`);
            }}
          >
            <Copy />
          </Button>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={`${entity.name} actions`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
              <Trash2 /> Delete {entity.name}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <CloseButton onClose={onClose} />
      </header>
      <div className="sf-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="flex gap-8 px-8 py-6">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <DialogPrimitive.Title asChild>
              <textarea
                value={title}
                rows={1}
                aria-label="Title"
                onChange={(event) => setTitle(event.target.value.replace(/\n/g, " "))}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                  if (event.key === "Escape") {
                    setTitle(ticket.title);
                  }
                }}
                className="ui-h2 field-sizing-content -mx-2 resize-none rounded-md bg-transparent px-2 py-1 outline-none hover:bg-accent/60 focus-visible:bg-transparent focus-visible:ring-focus-ring focus-visible:ring-[3px]"
              />
            </DialogPrimitive.Title>
            <section className="flex flex-col gap-2">
              <h3 className="ui-p2 text-muted-foreground font-medium">Description</h3>
              <div
                className="bg-card dark:bg-input/30 focus-within:border-ring focus-within:ring-focus-ring min-h-28 cursor-text rounded-lg border px-4 py-3 focus-within:ring-[3px]"
                onClick={(event) => {
                  if (event.target === event.currentTarget) editor?.commands.focus("end");
                }}
              >
                <MarkdownEditorContent editor={editor} variant={EditorVariant.Compact} />
              </div>
            </section>
            <section className="flex flex-col gap-3">
              <h3 className="ui-h4">Activity</h3>
              <CommentThread
                repo={repo.repo_id}
                target="ticket"
                targetId={ticket.ticket_id}
                layout={ThreadLayout.Activity}
              />
            </section>
          </div>
          <aside className="flex w-72 shrink-0 flex-col gap-1 self-start rounded-xl border p-4">
            <Property label="Status">
              <StatusMenu
                status={ticket.status}
                statuses={entity.statuses}
                onChange={(status) => save({ id: ticket.ticket_id, status }, "Status")}
              />
            </Property>
            <Property label="Assignee">
              <AssigneePicker
                assignee={ticket.assignee}
                people={people}
                onChange={(assignee) => save({ id: ticket.ticket_id, assignee }, "Assignee")}
              />
            </Property>
            <Property label="Type">
              <span className="ui-p3-flush bg-muted text-foreground inline-flex h-5 items-center rounded-sm px-1.5">
                {ticket.entity_name}
              </span>
            </Property>
            <Property label="ID">
              <span className="ui-p2-flush font-mono text-muted-foreground">{ticket.ticket_id}</span>
            </Property>
            <Property label="Repository">
              <span className="ui-p2-flush text-muted-foreground truncate">{repo.name}</span>
            </Property>
          </aside>
        </div>
      </div>
      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${ticket.ticket_id}?`}
        description={`“${ticket.title}” and its comments will be permanently deleted.`}
        pending={remove.isPending}
        onConfirm={() => {
          pendingDescription.current = null;
          window.clearTimeout(timer.current);
          remove.mutate(ticket.ticket_id, {
            onSuccess: () => {
              setConfirmDelete(false);
              toast(`${ticket.ticket_id} deleted`);
              onClose();
            },
            onError: (error) => toast.error(`Not deleted: ${error.message}`),
          });
        }}
      />
    </>
  );
}

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center gap-3">
      <span className="ui-p2-flush text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
    </div>
  );
}
