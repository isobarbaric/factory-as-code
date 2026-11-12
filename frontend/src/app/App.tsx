import { EntityType } from "@factory-as-code/factory-config";
import { CircleAlert, SearchX } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFactory, useRepositories } from "@/lib/queries";
import { navigate, useRoute } from "@/lib/router";
import { DocumentModule } from "./documents/DocumentModule";
import { FilesModule } from "./files/FilesModule";
import { HomeView } from "./home/HomeView";
import { FactoryView } from "./home/FactoryView";
import { FACTORY_VIEW, Sidebar } from "./shell/Sidebar";
import { ShellContext } from "./shell/ShellContext";
import { PageHeader } from "./shell/PageHeader";
import { TicketModule } from "./tickets/TicketModule";

const DEFAULT_REPO_PREFIX = "org:";

export function App() {
  const route = useRoute();
  const repositories = useRepositories();
  const current = repositories.data?.find((repo) => repo.repo_id === route.repo);
  const factory = useFactory(current?.repo_id);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const repos = repositories.data;
    if (!repos?.length || current) return;
    const fallback = repos.find((repo) => repo.repo_id.startsWith(DEFAULT_REPO_PREFIX)) ?? repos[0];
    navigate({ repo: fallback.repo_id }, { replace: true });
  }, [repositories.data, current]);

  useEffect(() => {
    document.title = current ? `${current.name} · Factory as Code` : "Factory as Code";
  }, [current]);

  let main;
  if (repositories.isError) {
    main = (
      <EmptyState
        icon={CircleAlert}
        title="Can't Reach the Factory API"
        description="Start it with `make api`, then reload this page."
        action={
          <Button variant="outline" size="sm" onClick={() => repositories.refetch()}>
            Try Again
          </Button>
        }
      />
    );
  } else if (repositories.data?.length === 0) {
    main = (
      <EmptyState
        icon={SearchX}
        title="No Repositories Registered"
        description="Register one with `make register REPO_ID=<id> MANIFEST=<path>`, then reload."
      />
    );
  } else if (!current) {
    main = <PageSkeleton />;
  } else if (!route.entity) {
    main = <HomeView repo={current} config={factory.data} />;
  } else if (route.entity === FACTORY_VIEW) {
    main = <FactoryView repo={current} config={factory.data} />;
  } else if (!factory.data) {
    main = factory.isError ? (
      <EmptyState
        icon={CircleAlert}
        title="Factory Didn't Load"
        description={`The manifest for ${current.name} couldn't be read: ${factory.error.message}`}
      />
    ) : (
      <PageSkeleton />
    );
  } else {
    const entity = factory.data.entities.find((item) => item.name === route.entity);
    if (!entity) {
      main = (
        <>
          <PageHeader crumbs={[{ label: route.entity }]} />
          <EmptyState
            icon={SearchX}
            title={`${current.name} Has No “${route.entity}”`}
            description="Its factory doesn't declare that entity. Pick one from the sidebar."
          />
        </>
      );
    } else if (entity.type === EntityType.Document) {
      main = <DocumentModule repo={current} entity={entity} record={route.record} />;
    } else if (entity.type === EntityType.Ticket) {
      main = <TicketModule key={entity.name} repo={current} entity={entity} record={route.record} />;
    } else {
      main = <FilesModule repo={current} entity={entity} />;
    }
  }

  return (
    <ShellContext.Provider
      value={{ sidebarOpen, toggleSidebar: () => setSidebarOpen((open) => !open) }}
    >
      <div className="bg-sidebar flex h-full">
        {sidebarOpen && (
          <Sidebar
            route={route}
            repositories={repositories.data}
            current={current}
            config={factory.data}
          />
        )}
        <main className="bg-card dark:bg-surface flex min-w-0 flex-1 flex-col">{main}</main>
      </div>
    </ShellContext.Provider>
  );
}

function PageSkeleton() {
  return (
    <>
      <div className="flex h-12 items-center border-b px-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24" />
      </div>
    </>
  );
}
