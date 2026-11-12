import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { navigate } from "@/lib/router";
import { useCreateDocument } from "@/lib/queries";

export function CreateDocumentDialog({
  repo,
  entity,
  open,
  onOpenChange,
}: {
  repo: string;
  entity: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const create = useCreateDocument(repo);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    create.mutate(
      { entity_name: entity, title: title.trim() },
      {
        onSuccess: (document) => {
          onOpenChange(false);
          setTitle("");
          navigate({ repo, entity, record: document.document_id });
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
        if (!next) setTitle("");
      }}
    >
      <DialogContent title={`New ${entity}`}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="document-title">Title</Label>
            <Input
              id="document-title"
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={`Name this ${entity.toLowerCase()}`}
            />
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
