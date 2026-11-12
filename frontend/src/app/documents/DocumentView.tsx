import type { Entity } from "@factory-as-code/factory-config";
import type { Document } from "@factory-as-code/factory-records";
import { FileX, MessageSquare, MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import {
  EditorToolbar,
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
import { ApiError, type Repository } from "@/lib/api";
import { pluralize } from "@/lib/entities";
import { useComments, useDeleteDocument, useDocument, useUpdateDocument } from "@/lib/queries";
import { navigate } from "@/lib/router";
import { cn } from "@/lib/utils";
import { CommentThread, ThreadLayout } from "../comments/CommentThread";
import { PageHeader } from "../shell/PageHeader";

const SAVE_DELAY_MS = 700;

export const SaveState = { Saved: "saved", Pending: "pending", Saving: "saving", Failed: "failed" } as const;
export type SaveState = (typeof SaveState)[keyof typeof SaveState];

export function DocumentView({
  repo,
  entity,
  documentId,
}: {
  repo: Repository;
  entity: Entity;
  documentId: string;
}) {
  const { data: document, isPending, error } = useDocument(repo.repo_id, documentId);
  const plural = pluralize(entity.name);
  const crumbs = [
    { label: plural, onClick: () => navigate({ repo: repo.repo_id, entity: entity.name }) },
    { label: document?.title ?? (isPending ? "…" : "Not Found") },
  ];

  if (isPending) {
    return (
      <>
        <PageHeader crumbs={crumbs} />
        <div className="mx-auto flex w-full max-w-[600px] flex-col gap-4 px-6 py-16">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </>
    );
  }
  if (!document) {
    const missing = error instanceof ApiError && error.status === 404;
    return (
      <>
        <PageHeader crumbs={crumbs} />
        <EmptyState
          icon={FileX}
          title={missing ? `${entity.name} Not Found` : `${entity.name} Didn't Load`}
          description={
            missing
              ? "It may have been deleted. Pick another from the sidebar."
              : "Check that the API is running, then reload."
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ repo: repo.repo_id, entity: entity.name })}
            >
              All {plural}
            </Button>
          }
        />
      </>
    );
  }
  return <DocumentEditor repo={repo} entity={entity} document={document} crumbs={crumbs} />;
}

function DocumentEditor({
  repo,
  entity,
  document,
  crumbs,
}: {
  repo: Repository;
  entity: Entity;
  document: Document;
  crumbs: { label: string; onClick?: () => void }[];
}) {
  const update = useUpdateDocument(repo.repo_id, document.document_id);
  const remove = useDeleteDocument(repo.repo_id);
  const [title, setTitle] = useState(document.title);
  const [saveState, setSaveState] = useState<SaveState>(SaveState.Saved);
  const [showComments, setShowComments] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pending = useRef<{ title?: string; content?: string }>({});
  const timer = useRef<number | undefined>(undefined);
  const { data: comments } = useComments(repo.repo_id, "document", document.document_id);
  const openComments = comments?.filter((comment) => !comment.resolved).length ?? 0;

  const flush = () => {
    window.clearTimeout(timer.current);
    const body = pending.current;
    if (Object.keys(body).length === 0) return;
    pending.current = {};
    setSaveState(SaveState.Saving);
    update.mutate(body, {
      onSuccess: () => {
        if (Object.keys(pending.current).length === 0) setSaveState(SaveState.Saved);
      },
      onError: (failure) => {
        pending.current = { ...body, ...pending.current };
        setSaveState(SaveState.Failed);
        toast.error(`Changes not saved: ${failure.message}`);
      },
    });
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;

  const schedule = (change: { title?: string; content?: string }) => {
    pending.current = { ...pending.current, ...change };
    setSaveState(SaveState.Pending);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => flushRef.current(), SAVE_DELAY_MS);
  };

  useEffect(() => () => flushRef.current(), []);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length > 0) {
        flushRef.current();
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  const editor = useMarkdownEditor({
    value: document.content,
    placeholder: `Write the ${entity.name.toLowerCase()}…`,
    onChange: (content) => schedule({ content }),
  });

  const saveLabel = {
    [SaveState.Saved]: "Saved",
    [SaveState.Pending]: "Editing",
    [SaveState.Saving]: "Saving…",
    [SaveState.Failed]: "Not saved",
  }[saveState];

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        actions={
          <>
            <span
              className={cn(
                "ui-p3-flush pr-1",
                saveState === SaveState.Failed ? "text-destructive-accent" : "text-subtle-foreground",
              )}
              aria-live="polite"
            >
              {saveLabel}
            </span>
            <Tooltip content={showComments ? "Hide Comments" : "Show Comments"} side="bottom">
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={showComments}
                className={cn("text-muted-foreground", showComments && "bg-accent text-foreground")}
                onClick={() => setShowComments((value) => !value)}
              >
                <MessageSquare />
                <span className="tabular-nums">{openComments}</span>
              </Button>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  aria-label="Document actions"
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
          </>
        }
      />
      {editor && (
        <div className="flex h-11 shrink-0 items-center border-b px-3">
          <EditorToolbar editor={editor} />
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <div
          className="sf-scrollbar min-w-0 flex-1 cursor-text overflow-y-auto"
          onClick={(event) => {
            if (event.target === event.currentTarget) editor?.commands.focus("end");
          }}
        >
          <div className="mx-auto flex w-full max-w-[600px] flex-col gap-4 px-6 pt-12 pb-32">
            <textarea
              value={title}
              rows={1}
              aria-label="Title"
              placeholder="Untitled"
              onChange={(event) => {
                const next = event.target.value.replace(/\n/g, " ");
                setTitle(next);
                if (next.trim()) schedule({ title: next.trim() });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  editor?.commands.focus("start");
                }
              }}
              onBlur={() => {
                if (!title.trim()) setTitle(document.title);
              }}
              className="font-document placeholder:text-subtle-foreground field-sizing-content resize-none bg-transparent text-[length:var(--text-doc-h1)] leading-[var(--leading-doc-h1)] font-medium tracking-[var(--tracking-doc-h1)] outline-none"
            />
            <MarkdownEditorContent editor={editor} variant={EditorVariant.Document} />
          </div>
        </div>
        {showComments && (
          <aside
            aria-label="Comments"
            className="sf-scrollbar flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l px-4 py-4"
          >
            <h2 className="ui-p2 text-foreground font-medium">Comments</h2>
            <CommentThread
              repo={repo.repo_id}
              target="document"
              targetId={document.document_id}
              layout={ThreadLayout.Margin}
            />
          </aside>
        )}
      </div>
      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${entity.name}?`}
        description={`“${document.title}” and its comments will be permanently deleted.`}
        pending={remove.isPending}
        onConfirm={() => {
          pending.current = {};
          window.clearTimeout(timer.current);
          remove.mutate(document, {
            onSuccess: () => {
              setConfirmDelete(false);
              toast(`${entity.name} deleted`);
              navigate({ repo: repo.repo_id, entity: entity.name });
            },
            onError: (failure) => toast.error(`Not deleted: ${failure.message}`),
          });
        }}
      />
    </>
  );
}
