import type { Entity } from "@factory-as-code/factory-config";
import { FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { pluralize } from "@/lib/entities";
import type { Repository } from "@/lib/api";
import { PageHeader } from "../shell/PageHeader";

export function FilesModule({ repo, entity }: { repo: Repository; entity: Entity }) {
  const plural = pluralize(entity.name);
  return (
    <>
      <PageHeader crumbs={[{ label: plural }]} />
      <div className="sf-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-1">
            <h1 className="ui-h2">{plural}</h1>
            <p className="ui-p2 text-muted-foreground">
              Uploaded artifacts for {repo.name}, grouped under an object-storage prefix.
            </p>
          </div>
          <div className="bg-card overflow-hidden rounded-xl border">
            <div className="bg-table-header ui-p2-flush text-muted-foreground grid h-9 grid-cols-[1fr_8rem_8rem] items-center border-b px-4">
              <span>Name</span>
              <span>Size</span>
              <span>Uploaded</span>
            </div>
            <EmptyState
              icon={FolderOpen}
              title={`No ${plural} Yet`}
              description={`${plural} are file sets, such as test runs with their screenshots and logs. Uploading isn't part of this preview yet; records registered for ${entity.name} will list here.`}
            />
          </div>
        </div>
      </div>
    </>
  );
}
