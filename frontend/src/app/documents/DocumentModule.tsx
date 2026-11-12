import type { Entity } from "@factory-as-code/factory-config";
import { FileText, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Repository } from "@/lib/api";
import { entityIcon, pluralize } from "@/lib/entities";
import { useDocuments } from "@/lib/queries";
import { navigate } from "@/lib/router";
import { PageHeader } from "../shell/PageHeader";
import { CreateDocumentDialog } from "./CreateDocumentDialog";
import { DocumentView } from "./DocumentView";

export function DocumentModule({
  repo,
  entity,
  record,
}: {
  repo: Repository;
  entity: Entity;
  record: string | undefined;
}) {
  if (record) {
    return <DocumentView key={record} repo={repo} entity={entity} documentId={record} />;
  }
  return <DocumentIndex repo={repo} entity={entity} />;
}

function DocumentIndex({ repo, entity }: { repo: Repository; entity: Entity }) {
  const { data: documents, isPending, isError, refetch } = useDocuments(repo.repo_id, entity.name);
  const [creating, setCreating] = useState(false);
  const plural = pluralize(entity.name);
  const Icon = entityIcon(entity);
  const sorted = useMemo(
    () => [...(documents ?? [])].sort((a, b) => a.title.localeCompare(b.title)),
    [documents],
  );

  return (
    <>
      <PageHeader
        crumbs={[{ label: plural }]}
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus /> {entity.name}
          </Button>
        }
      />
      <div className="sf-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-1">
            <h1 className="ui-h2">{plural}</h1>
            <p className="ui-p2 text-muted-foreground">
              {documents
                ? `${documents.length} ${documents.length === 1 ? entity.name.toLowerCase() : plural.toLowerCase()} in ${repo.name}`
                : " "}
            </p>
          </div>
          {isPending && (
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-12" />
              ))}
            </div>
          )}
          {isError && (
            <p className="ui-p2 text-muted-foreground">
              <span className="text-destructive-accent">{plural} didn't load.</span> Check that
              the API is running, then{" "}
              <button className="text-link underline" onClick={() => refetch()}>
                try again
              </button>
              .
            </p>
          )}
          {documents?.length === 0 && (
            <div className="rounded-xl border border-dashed">
              <EmptyState
                icon={Icon}
                title={`No ${plural} Yet`}
                description={`${plural} written here are stored with ${repo.name}'s factory records, where agents can read them over MCP.`}
                action={
                  <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
                    <Plus /> New {entity.name}
                  </Button>
                }
              />
            </div>
          )}
          {sorted.length > 0 && (
            <ul className="bg-card flex flex-col overflow-hidden rounded-xl border">
              {sorted.map((doc) => (
                <li key={doc.document_id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() =>
                      navigate({ repo: repo.repo_id, entity: entity.name, record: doc.document_id })
                    }
                    className="hover-neutral group flex h-12 w-full items-center gap-3 px-4 text-left outline-none focus-visible:bg-accent"
                  >
                    <FileText className="text-muted-foreground size-4 shrink-0" />
                    <span className="ui-p2-flush text-foreground group-hover:text-primary-accent min-w-0 flex-1 truncate">
                      {doc.title}
                    </span>
                    <span className="ui-p3-flush font-mono text-subtle-foreground shrink-0">
                      {doc.document_id}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <CreateDocumentDialog
        repo={repo.repo_id}
        entity={entity.name}
        open={creating}
        onOpenChange={setCreating}
      />
    </>
  );
}
