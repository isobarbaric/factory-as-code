import { EntityType, type FactoryConfig } from "@factory-as-code/factory-config";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { StatusChip } from "@/components/StatusChip";
import { Skeleton } from "@/components/ui/skeleton";
import type { Repository } from "@/lib/api";
import { entityIcon } from "@/lib/entities";
import { PageHeader } from "../shell/PageHeader";

export function FactoryView({
  repo,
  config,
}: {
  repo: Repository;
  config: FactoryConfig | undefined;
}) {
  const command = useRef<HTMLInputElement>(null);
  return (
    <>
      <PageHeader crumbs={[{ label: "Factory" }]} />
      <div className="sf-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
          <div className="flex flex-col gap-1">
            <h1 className="ui-h2">Factory</h1>
            <p className="ui-p2 text-muted-foreground">
              Built from <code className="font-mono">.factory/factory.ts</code> in {repo.name} (
              <span className="font-mono">{repo.repo_id}</span>). Change the file and rebuild to
              change this workspace.
            </p>
          </div>
          <Dialog>
            <DialogPrimitive.Trigger asChild>
              <Button size="sm" variant="outline" className="self-start">Connect to MCP</Button>
            </DialogPrimitive.Trigger>
            <DialogContent
              title="Connect to MCP"
              description="From the Factory as Code checkout, run this command to print your local MCP client configuration."
            >
              <div className="flex gap-2">
                <input
                  ref={command}
                  aria-label="MCP configuration command"
                  className="bg-muted min-w-0 flex-1 rounded-md border px-3 font-mono"
                  readOnly
                  value="make mcp-config"
                  onFocus={(event) => event.target.select()}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText("make mcp-config");
                      toast.success("Command copied");
                    } catch {
                      command.current?.focus();
                      toast.error("Copy the selected command manually.");
                    }
                  }}
                >
                  Copy command
                </Button>
              </div>
              <p className="ui-p2">
                Add the generated factory server entry to your MCP client, then reconnect.
                The server can read all registered repositories.
              </p>
            </DialogContent>
          </Dialog>
          {!config ? (
            <Skeleton className="h-48" />
          ) : (
            <>
              <section className="flex flex-col gap-3">
                <h2 className="ui-h4">Entities</h2>
                <div className="bg-card overflow-hidden rounded-xl border">
                  <table className="w-full border-collapse">
                    <thead className="bg-table-header">
                      <tr className="border-b">
                        <th className="ui-p2-flush text-muted-foreground h-9 px-4 text-left font-normal">Name</th>
                        <th className="ui-p2-flush text-muted-foreground px-4 text-left font-normal">Type</th>
                        <th className="ui-p2-flush text-muted-foreground px-4 text-left font-normal">Statuses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.entities.map((entity) => {
                        const Icon = entityIcon(entity);
                        return (
                          <tr key={entity.name} className="border-b last:border-b-0">
                            <td className="h-11 px-4">
                              <span className="ui-p2-flush flex items-center gap-2">
                                <Icon className="text-muted-foreground size-4" /> {entity.name}
                              </span>
                            </td>
                            <td className="ui-p2-flush text-muted-foreground px-4 capitalize">{entity.type}</td>
                            <td className="px-4 py-2">
                              {entity.type === EntityType.Ticket ? (
                                <span className="flex flex-wrap gap-1">
                                  {entity.statuses.map((status) => (
                                    <StatusChip key={status} status={status} statuses={entity.statuses} />
                                  ))}
                                </span>
                              ) : (
                                <span className="ui-p2-flush text-subtle-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="flex flex-col gap-3">
                <h2 className="ui-h4">Configuration</h2>
                <dl className="bg-card grid grid-cols-[10rem_1fr] overflow-hidden rounded-xl border">
                  {[
                    ["Integrations", config.integrations?.join(", ") || "None"],
                    ["Skills", config.skills?.root ?? "Not configured"],
                    ["Automations", config.automations?.root ?? "Not configured"],
                  ].map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="ui-p2-flush text-muted-foreground border-b px-4 py-3 last-of-type:border-b-0">
                        {label}
                      </dt>
                      <dd className="ui-p2-flush text-foreground border-b px-4 py-3 font-mono last-of-type:border-b-0">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
