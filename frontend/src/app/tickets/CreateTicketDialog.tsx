import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { navigate } from "@/lib/router";
import { useCreateTicket } from "@/lib/queries";
import { AssigneePicker, StatusMenu } from "./TicketFields";

export function CreateTicketDialog({
  repo,
  entity,
  statuses,
  people,
  initialStatus,
  open,
  onOpenChange,
}: {
  repo: string;
  entity: string;
  statuses: readonly string[];
  people: string[];
  initialStatus?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(initialStatus ?? statuses[0]);
  const [assignee, setAssignee] = useState<string | null>(null);
  const create = useCreateTicket(repo);

  const reset = () => {
    setTitle("");
    setDescription("");
    setAssignee(null);
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    create.mutate(
      { entity_name: entity, title: title.trim(), description, status, assignee },
      {
        onSuccess: (ticket) => {
          onOpenChange(false);
          reset();
          toast(`${ticket.ticket_id} created`);
          navigate({ repo, entity, record: ticket.ticket_id });
        },
        onError: (error) => toast.error(`${entity} not created: ${error.message}`),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setStatus(initialStatus ?? statuses[0]);
        else reset();
      }}
    >
      <DialogContent title={`New ${entity}`}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ticket-title">Title</Label>
            <Input
              id="ticket-title"
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to happen?"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ticket-description">Description</Label>
            <Textarea
              id="ticket-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add context, acceptance criteria or links (Markdown)"
              rows={4}
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="ui-p2-flush text-muted-foreground">Status</span>
              <StatusMenu status={status} statuses={statuses} onChange={setStatus} />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="ui-p2-flush text-muted-foreground">Assignee</span>
              <AssigneePicker assignee={assignee} people={people} onChange={setAssignee} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!title.trim() || create.isPending}>
              Create {entity}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
