import { ChevronsUpDown, Factory, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type { Repository } from "@/lib/api";
import { navigate } from "@/lib/router";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/components/ui/focus-ring";

const GROUP_LABELS: Record<string, string> = {
  org: "Organization",
  github: "GitHub Repositories",
  workspace: "Workspaces",
  local: "Local",
};

function groupLabel(repoId: string) {
  const prefix = repoId.includes(":") ? repoId.split(":")[0] : "";
  return GROUP_LABELS[prefix] ?? (prefix ? prefix[0].toUpperCase() + prefix.slice(1) : "Other");
}

export function RepoSwitcher({
  repositories,
  current,
}: {
  repositories: Repository[] | undefined;
  current: Repository | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const map = new Map<string, Repository[]>();
    for (const repo of repositories ?? []) {
      if (needle && !`${repo.name} ${repo.repo_id}`.toLowerCase().includes(needle)) continue;
      const label = groupLabel(repo.repo_id);
      map.set(label, [...(map.get(label) ?? []), repo]);
    }
    return [...map.entries()];
  }, [repositories, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            FOCUS_RING,
            "hover-neutral flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md p-2 text-left",
          )}
        >
          <Factory className="text-sidebar-foreground size-4 shrink-0" aria-hidden="true" />
          {current ? (
            <span className="ui-p2-flush text-sidebar-foreground min-w-0 flex-1 truncate">
              {current.name}
            </span>
          ) : (
            <Skeleton className="h-3.5 w-28" />
          )}
          <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="text-muted-foreground size-4" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a repository…"
            aria-label="Find a repository"
            className="ui-p2 placeholder:text-subtle-foreground h-10 flex-1 bg-transparent outline-none"
          />
        </div>
        <div className="sf-scrollbar max-h-96 overflow-y-auto p-1">
          {groups.length === 0 && (
            <p className="ui-p2 text-muted-foreground px-2 py-6 text-center">
              No repositories match “{query}”.
            </p>
          )}
          {groups.map(([label, repos]) => (
            <div key={label} role="group" aria-label={label} className="pb-1">
              <p className="ui-p3-flush text-muted-foreground px-2 pt-2 pb-1.5">{label}</p>
              {repos.map((repo) => {
                const selected = repo.repo_id === current?.repo_id;
                return (
                  <button
                    key={repo.repo_id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      navigate({ repo: repo.repo_id });
                    }}
                    className="hover-neutral focus-visible:bg-accent flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left outline-none"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border",
                        selected && "border-primary-accent",
                      )}
                    >
                      {selected && <span className="bg-primary-accent size-2 rounded-full" />}
                    </span>
                    <span className="ui-p2-flush text-foreground min-w-0 flex-1 truncate">
                      {repo.name}
                    </span>
                    <span className="ui-p3-flush font-mono text-subtle-foreground shrink-0 truncate">
                      {repo.repo_id}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
