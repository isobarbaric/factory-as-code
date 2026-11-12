import { EntityType, type FactoryConfig } from "@factory-as-code/factory-config";
import { ArrowRight, Plug } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/StatusChip";
import { api, type Repository } from "@/lib/api";
import { entityIcon, pluralize } from "@/lib/entities";
import { keys, useTickets } from "@/lib/queries";
import { navigate } from "@/lib/router";
import { PageHeader } from "../shell/PageHeader";

const TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.Document]: "Documents",
  [EntityType.Ticket]: "Tickets",
  [EntityType.Files]: "Files",
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeView({ repo, config }: { repo: Repository; config: FactoryConfig | undefined }) {
  const { data: tickets } = useTickets(repo.repo_id);
  const documentEntities = config?.entities.filter((e) => e.type === EntityType.Document) ?? [];
  const documentCounts = useQueries({
    queries: documentEntities.map((entity) => ({
      queryKey: keys.documents(repo.repo_id, entity.name),
      queryFn: () => api.documents(repo.repo_id, entity.name),
    })),
  });

  return (
    <>
      <PageHeader crumbs={[{ label: "Home" }]} />
      <div className="sf-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-14">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="ui-h1">{greeting()}.</h1>
            <p className="ui-p1 text-muted-foreground">
              This is how <span className="text-foreground">{repo.name}</span> works, as declared in
              its <code className="font-mono ui-p2">.factory/factory.ts</code>.
            </p>
          </div>

          {!config ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-16" />
              ))}
            </div>
          ) : (
            [EntityType.Document, EntityType.Ticket, EntityType.Files].map((type) => {
              const entities = config.entities.filter((entity) => entity.type === type);
              if (entities.length === 0) return null;
              return (
                <section key={type} className="flex flex-col gap-3">
                  <h2 className="ui-p2 text-muted-foreground font-medium">{TYPE_LABELS[type]}</h2>
                  <ul className="bg-card flex flex-col overflow-hidden rounded-xl border">
                    {entities.map((entity) => {
                      const Icon = entityIcon(entity);
                      const docIndex = documentEntities.indexOf(entity);
                      const entityTickets =
                        entity.type === EntityType.Ticket
                          ? tickets?.filter((ticket) => ticket.entity_name === entity.name)
                          : undefined;
                      const count =
                        entity.type === EntityType.Document
                          ? documentCounts[docIndex]?.data?.length
                          : entity.type === EntityType.Ticket
                            ? entityTickets?.length
                            : 0;
                      return (
                        <li key={entity.name} className="border-b last:border-b-0">
                          <button
                            type="button"
                            onClick={() => navigate({ repo: repo.repo_id, entity: entity.name })}
                            className="hover-neutral group flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left outline-none focus-visible:bg-accent"
                          >
                            <Icon className="text-muted-foreground size-4 shrink-0" />
                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                              <span className="ui-p2-flush text-foreground group-hover:text-primary-accent">
                                {pluralize(entity.name)}
                              </span>
                              {entity.type === EntityType.Ticket && (
                                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  {entity.statuses.map((status) => (
                                    <span
                                      key={status}
                                      className="ui-p3-flush text-muted-foreground flex items-center gap-1.5"
                                    >
                                      <StatusDot status={status} statuses={entity.statuses} />
                                      {status}
                                      {entityTickets && (
                                        <span className="text-subtle-foreground tabular-nums">
                                          {entityTickets.filter((t) => t.status === status).length}
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </span>
                            <span className="ui-p2-flush text-muted-foreground tabular-nums">
                              {count ?? "–"}
                            </span>
                            <ArrowRight className="text-subtle-foreground size-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })
          )}

          {config?.integrations && config.integrations.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="ui-p2 text-muted-foreground font-medium">Integrations</h2>
              <div className="flex flex-wrap gap-2">
                {config.integrations.map((integration) => (
                  <span
                    key={integration}
                    className="ui-p3-flush bg-card text-foreground inline-flex h-7 items-center gap-1.5 rounded-md border px-2"
                  >
                    <Plug className="text-muted-foreground size-3.5" />
                    {integration}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
