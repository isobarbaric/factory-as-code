import type { Comment, CommentTarget } from "@factory-as-code/factory-records";
import { Check, ChevronRight, MessageSquare, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { displayPerson } from "@/lib/entities";
import { useDisplayName } from "@/lib/preferences";
import { useCommentMutations, useComments } from "@/lib/queries";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

export const ThreadLayout = { Margin: "margin", Activity: "activity" } as const;
export type ThreadLayout = (typeof ThreadLayout)[keyof typeof ThreadLayout];

interface ThreadProps {
  repo: string;
  target: CommentTarget;
  targetId: string;
  layout: ThreadLayout;
}

export function CommentThread({ repo, target, targetId, layout }: ThreadProps) {
  const { data: comments, isPending, isError, refetch } = useComments(repo, target, targetId);
  const mutations = useCommentMutations(repo, target, targetId);
  const [showResolved, setShowResolved] = useState(false);
  const open = comments?.filter((comment) => !comment.resolved) ?? [];
  const resolved = comments?.filter((comment) => comment.resolved) ?? [];

  const composer = <CommentComposer onSubmit={(body) => mutations.create.mutateAsync(body)} />;
  const card = (comment: Comment) => (
    <CommentCard
      key={comment.comment_id}
      comment={comment}
      layout={layout}
      onResolve={(value) =>
        mutations.update.mutate({ comment_id: comment.comment_id, resolved: value })
      }
      onDelete={() =>
        mutations.remove.mutate(comment.comment_id, {
          onSuccess: () => toast("Comment deleted"),
        })
      }
    />
  );

  let body;
  if (isPending) {
    body = (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  } else if (isError) {
    body = (
      <p className="ui-p2 text-muted-foreground">
        <span className="text-destructive-accent">Comments didn't load.</span>{" "}
        <button className="text-link underline" onClick={() => refetch()}>
          Try again
        </button>
      </p>
    );
  } else {
    body = (
      <>
        {open.length === 0 && layout === ThreadLayout.Margin && (
          <EmptyState
            icon={MessageSquare}
            title="No Comments Yet"
            description="Start a thread to ask a question or flag something to change."
            className="py-8"
          />
        )}
        {open.map(card)}
        {resolved.length > 0 && (
          <button
            type="button"
            onClick={() => setShowResolved((value) => !value)}
            className="ui-p3-flush text-muted-foreground hover:text-foreground flex items-center gap-1 self-start py-1"
          >
            <ChevronRight className={cn("size-3.5", showResolved && "rotate-90")} />
            {resolved.length} Resolved
          </button>
        )}
        {showResolved && resolved.map(card)}
      </>
    );
  }

  if (layout === ThreadLayout.Margin) {
    return (
      <div className="flex flex-col gap-3">
        {composer}
        {body}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {body}
      {composer}
    </div>
  );
}

function CommentCard({
  comment,
  layout,
  onResolve,
  onDelete,
}: {
  comment: Comment;
  layout: ThreadLayout;
  onResolve: (resolved: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <article
      className={cn(
        "group/comment flex flex-col gap-1.5 rounded-lg border p-3",
        layout === ThreadLayout.Margin ? "bg-card" : "bg-card dark:bg-surface",
        comment.resolved && "opacity-70",
      )}
    >
      <header className="flex items-center gap-2">
        <Avatar name={comment.author} />
        <span className="ui-p2-flush text-foreground min-w-0 truncate">
          {displayPerson(comment.author)}
        </span>
        <span className="ui-p3-flush text-subtle-foreground shrink-0">
          {timeAgo(comment.created_at)}
        </span>
        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-focus-within/comment:opacity-100 group-hover/comment:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            aria-label={comment.resolved ? "Reopen comment" : "Resolve comment"}
            title={comment.resolved ? "Reopen" : "Resolve"}
            onClick={() => onResolve(!comment.resolved)}
          >
            {comment.resolved ? <RotateCcw /> : <Check />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                aria-label="Comment actions"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-36">
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <p className="ui-p2 text-foreground pl-7 whitespace-pre-wrap">{comment.body}</p>
      {comment.resolved && (
        <p className="ui-p3 text-muted-foreground flex items-center gap-1 pl-7">
          <Check className="size-3" /> Resolved
        </p>
      )}
    </article>
  );
}

function CommentComposer({
  onSubmit,
}: {
  onSubmit: (body: { author: string; body: string }) => Promise<unknown>;
}) {
  const [author] = useDisplayName();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const canSend = text.trim().length > 0 && !pending;

  async function send() {
    if (!canSend) return;
    setPending(true);
    try {
      await onSubmit({ author, body: text.trim() });
      setText("");
    } catch (error) {
      toast.error(`Comment not sent: ${(error as Error).message}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="bg-card dark:bg-input/30 focus-within:border-ring focus-within:ring-focus-ring flex flex-col rounded-lg border focus-within:ring-[3px]">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void send();
          }
        }}
        rows={2}
        aria-label="Comment"
        placeholder="Enter your comment…"
        className="ui-p2 placeholder:text-subtle-foreground field-sizing-content max-h-60 min-h-16 resize-none bg-transparent px-3 pt-2.5 outline-none"
      />
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        <span className="ui-p3-flush text-subtle-foreground pl-1">⌘↵ to send</span>
        <Button size="xs" disabled={!canSend} onClick={() => void send()}>
          Send Comment
        </Button>
      </div>
    </div>
  );
}
