import { EntityType, type Entity, type FactoryConfig } from "@factory-as-code/factory-config";
import {
  Check,
  ChevronLeft,
  FileText,
  House,
  Monitor,
  Moon,
  Pencil,
  Plus,
  Search,
  Settings2,
  Sun,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import type { Repository } from "@/lib/api";
import { displayPerson, entityIcon, pluralize } from "@/lib/entities";
import { ThemePreference, useDisplayName, useThemePreference } from "@/lib/preferences";
import { useDocuments } from "@/lib/queries";
import { navigate, type Route } from "@/lib/router";
import { cn } from "@/lib/utils";
import { CreateDocumentDialog } from "../documents/CreateDocumentDialog";
import { RepoSwitcher } from "./RepoSwitcher";

export const FACTORY_VIEW = "factory";

const navItemClass =
  "hover-neutral hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground ui-p2-flush flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden focus-visible:ring-focus-ring focus-visible:ring-[3px] [&>svg]:size-4 [&>svg]:shrink-0";

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  trailing,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
  trailing?: ReactNode;
}) {
  return (
    <button type="button" data-active={active} className={navItemClass} onClick={onClick}>
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}

const Separator = () => <div className="bg-sidebar-border mx-2 my-2 h-px" role="separator" />;

export function Sidebar({
  route,
  repositories,
  current,
  config,
}: {
  route: Route;
  repositories: Repository[] | undefined;
  current: Repository | undefined;
  config: FactoryConfig | undefined;
}) {
  const entity = config?.entities.find((item) => item.name === route.entity);
  const drillIn = entity?.type === EntityType.Document && current;

  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border flex w-60 shrink-0 flex-col border-r">
      <div className="flex h-12 shrink-0 items-center px-2">
        <RepoSwitcher repositories={repositories} current={current} />
      </div>
      {drillIn ? (
        <DocumentNav repo={current.repo_id} entity={entity} route={route} />
      ) : (
        <MainNav route={route} config={config} />
      )}
      <SidebarFooter />
    </aside>
  );
}

function MainNav({ route, config }: { route: Route; config: FactoryConfig | undefined }) {
  const repo = route.repo;
  return (
    <nav className="sf-scrollbar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pt-1">
      <NavItem
        icon={House}
        label="Home"
        active={!route.entity}
        onClick={() => navigate({ repo })}
      />
      <Separator />
      {config
        ? config.entities.map((item) => (
            <NavItem
              key={item.name}
              icon={entityIcon(item)}
              label={pluralize(item.name)}
              active={route.entity === item.name}
              onClick={() => navigate({ repo, entity: item.name })}
            />
          ))
        : [0, 1, 2, 3].map((index) => (
            <div key={index} className="flex h-8 items-center gap-2 px-2">
              <Skeleton className="size-4" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
      <Separator />
      <NavItem
        icon={Settings2}
        label="Factory"
        active={route.entity === FACTORY_VIEW}
        onClick={() => navigate({ repo, entity: FACTORY_VIEW })}
      />
    </nav>
  );
}

function DocumentNav({ repo, entity, route }: { repo: string; entity: Entity; route: Route }) {
  const { data: documents, isPending, isError } = useDocuments(repo, entity.name);
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return (documents ?? [])
      .filter((doc) => !needle || doc.title.toLowerCase().includes(needle))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [documents, filter]);
  const Icon = entityIcon(entity);
  const plural = pluralize(entity.name);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-8 items-center gap-1 px-2">
        <Tooltip content="Back" side="bottom">
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            aria-label="Back to navigation"
            onClick={() => navigate({ repo })}
          >
            <ChevronLeft />
          </Button>
        </Tooltip>
        <span className="ui-p2-flush text-sidebar-foreground flex-1 truncate text-center">
          {plural}
        </span>
        <span className="size-7" aria-hidden="true" />
      </div>
      <div className="px-2 pt-1 pb-1">
        <label className="bg-sidebar-accent/60 focus-within:ring-focus-ring flex h-8 items-center gap-2 rounded-md border px-2 focus-within:ring-[3px]">
          <Search className="text-muted-foreground size-3.5" aria-hidden="true" />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={`Filter ${plural.toLowerCase()}`}
            aria-label={`Filter ${plural}`}
            className="ui-p2-flush placeholder:text-subtle-foreground min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>
      </div>
      <div className="flex h-8 items-center gap-1 pr-2 pl-4">
        <span className="ui-p3-flush text-sidebar-foreground/70 flex-1">{plural}</span>
        <Tooltip content={`New ${entity.name}`} side="bottom">
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            aria-label={`New ${entity.name}`}
            onClick={() => setCreating(true)}
          >
            <Plus />
          </Button>
        </Tooltip>
      </div>
      <nav className="sf-scrollbar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
        {isPending &&
          [0, 1, 2].map((index) => (
            <div key={index} className="flex h-8 items-center gap-2 px-2">
              <Skeleton className="size-4" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        {isError && (
          <p className="ui-p3 text-destructive-accent px-2 py-2">
            {plural} didn't load. Check that the API is running.
          </p>
        )}
        {documents && documents.length === 0 && (
          <p className="ui-p3 text-muted-foreground px-2 py-2">
            No {plural.toLowerCase()} yet. Use + to write the first one.
          </p>
        )}
        {documents && documents.length > 0 && shown.length === 0 && (
          <p className="ui-p3 text-muted-foreground px-2 py-2">Nothing matches “{filter}”.</p>
        )}
        {shown.map((doc) => (
          <NavItem
            key={doc.document_id}
            icon={entity.type === EntityType.Document ? FileText : Icon}
            label={doc.title}
            active={route.record === doc.document_id}
            onClick={() => navigate({ repo, entity: entity.name, record: doc.document_id })}
          />
        ))}
      </nav>
      <CreateDocumentDialog
        repo={repo}
        entity={entity.name}
        open={creating}
        onOpenChange={setCreating}
      />
    </div>
  );
}

function SidebarFooter() {
  const [name, setName] = useDisplayName();
  const [theme, setTheme] = useThemePreference();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(name);

  return (
    <div className="flex h-12 shrink-0 items-center px-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(navItemClass, "h-9")}
            aria-label="Account and appearance"
          >
            <Avatar name={name} />
            <span className="min-w-0 flex-1 truncate">{displayPerson(name)}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value as ThemePreference)}
          >
            <DropdownMenuRadioItem value={ThemePreference.Light}>
              <Sun /> Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={ThemePreference.Dark}>
              <Moon /> Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={ThemePreference.System}>
              <Monitor /> System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setDraft(name);
              setRenaming(true);
            }}
          >
            <Pencil /> Change Display Name
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent
          title="Display Name"
          description="Your comments are signed with this name. It's stored in this browser only."
        >
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setName(draft);
              setRenaming(false);
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="display-name">Name</Label>
              <Input
                id="display-name"
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">
                <Check /> Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
