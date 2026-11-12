import type { Entity } from "@factory-as-code/factory-config";
import { ChevronRight, Columns3, Plus, Rows3, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { StatusDot } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import type { Repository, TicketSummary } from "@/lib/api";
import { entityIcon, pluralize } from "@/lib/entities";
import { useTickets, useUpdateTicket } from "@/lib/queries";
import { navigate } from "@/lib/router";
import { cn } from "@/lib/utils";
import { PageHeader } from "../shell/PageHeader";
import { CreateTicketDialog } from "./CreateTicketDialog";
import { AssigneeLabel, StatusMenu } from "./TicketFields";
import { TicketSheet } from "./TicketSheet";

export const TicketLayout = { Table: "table", Board: "board" } as const;
export type TicketLayout = (typeof TicketLayout)[keyof typeof TicketLayout];

export function TicketModule({
  repo,
  entity,
  record,
}: {
  repo: Repository;
  entity: Entity & { statuses: readonly string[] };
  record: string | undefined;
}) {
  const { data: allTickets, isPending, isError, refetch } = useTickets(repo.repo_id);
  const update = useUpdateTicket(repo.repo_id);
  const [layout, setLayout] = useState<TicketLayout>(TicketLayout.Table);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState<{ status?: string } | null>(null);
  const plural = pluralize(entity.name);
  const statuses = entity.statuses;

  const tickets = useMemo(
    () => (allTickets ?? []).filter((ticket) => ticket.entity_name === entity.name),
    [allTickets, entity.name],
  );
  const people = useMemo(
    () =>
      [...new Set((allTickets ?? []).map((t) => t.assignee).filter((a): a is string => !!a))].sort(),
    [allTickets],
  );
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tickets;
    return tickets.filter((ticket) =>
      `${ticket.ticket_id} ${ticket.title} ${ticket.assignee ?? ""}`.toLowerCase().includes(needle),
    );
  }, [tickets, query]);
  const groups = useMemo(() => {
    const known = statuses.map((status) => ({
      status,
      tickets: shown.filter((ticket) => ticket.status === status),
    }));
    const stray = shown.filter((ticket) => !statuses.includes(ticket.status));
    return stray.length ? [...known, { status: "Other", tickets: stray }] : known;
  }, [shown, statuses]);

  const open = (ticket: TicketSummary) =>
    navigate({ repo: repo.repo_id, entity: entity.name, record: ticket.ticket_id });
  const setStatus = (ticket: TicketSummary, status: string) =>
    update.mutate(
      { id: ticket.ticket_id, status },
      { onError: (error) => toast.error(`Status not changed: ${error.message}`) },
    );

  let content;
  if (isPending) {
    content = (
      <div className="flex flex-col gap-2 p-4">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-9" />
        ))}
      </div>
    );
  } else if (isError) {
    content = (
      <p className="ui-p2 text-muted-foreground p-6 text-center">
        <span className="text-destructive-accent">{plural} didn't load.</span> Check that the API is
        running, then{" "}
        <button className="text-link underline" onClick={() => refetch()}>
          try again
        </button>
        .
      </p>
    );
  } else if (tickets.length === 0) {
    content = (
      <EmptyState
        icon={entityIcon(entity)}
        title={`No ${plural} Yet`}
        description={`Track work as ${plural.toLowerCase()} moving through ${statuses.join(", ")}.`}
        action={
          <Button size="sm" variant="outline" onClick={() => setCreating({})}>
            <Plus /> New {entity.name}
          </Button>
        }
      />
    );
  } else if (shown.length === 0) {
    content = (
      <EmptyState
        icon={Search}
        title={`No ${plural} Match`}
        description={`Nothing matches “${query}”.`}
        action={
          <Button size="sm" variant="outline" onClick={() => setQuery("")}>
            Clear Search
          </Button>
        }
      />
    );
  } else if (layout === TicketLayout.Table) {
    content = (
      <TicketTable
        groups={groups}
        statuses={statuses}
        selected={record}
        onOpen={open}
        onStatus={setStatus}
        onCreate={(status) => setCreating({ status })}
      />
    );
  } else {
    content = (
      <TicketBoard
        groups={groups}
        statuses={statuses}
        selected={record}
        onOpen={open}
        onStatus={setStatus}
        onCreate={(status) => setCreating({ status })}
      />
    );
  }

  return (
    <>
      <PageHeader crumbs={[{ label: plural }]} />
      <div className="flex shrink-0 items-center gap-2 px-3 pt-2 pb-2">
        <label className="dark:bg-input/30 focus-within:border-ring focus-within:ring-focus-ring flex h-8 w-72 items-center gap-2 rounded-md border px-2.5 focus-within:ring-[3px]">
          <Search className="text-muted-foreground size-4" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            aria-label={`Search ${plural}`}
            className="ui-p2-flush placeholder:text-subtle-foreground min-w-0 flex-1 bg-transparent outline-none"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </label>
        <div className="bg-muted flex h-8 items-center rounded-md p-0.5" role="group" aria-label="Layout">
          {[
            { value: TicketLayout.Table, label: "Table", icon: Rows3 },
            { value: TicketLayout.Board, label: "Board", icon: Columns3 },
          ].map((option) => (
            <Tooltip key={option.value} content={option.label} side="bottom">
              <button
                type="button"
                aria-label={option.label}
                aria-pressed={layout === option.value}
                onClick={() => setLayout(option.value)}
                className={cn(
                  "text-muted-foreground flex h-7 w-8 items-center justify-center rounded-sm",
                  layout === option.value && "bg-card text-foreground shadow-xs",
                )}
              >
                <option.icon className="size-4" />
              </button>
            </Tooltip>
          ))}
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setCreating({})}>
          <Plus /> {entity.name}
        </Button>
      </div>
      <div className="sf-scrollbar flex min-h-0 flex-1 flex-col overflow-auto px-3 pb-3">
        {content}
      </div>
      {allTickets && (
        <footer className="ui-p3-flush text-muted-foreground flex h-8 shrink-0 items-center border-t px-4 tabular-nums">
          {tickets.length} {tickets.length === 1 ? entity.name.toLowerCase() : plural.toLowerCase()}
        </footer>
      )}
      <CreateTicketDialog
        repo={repo.repo_id}
        entity={entity.name}
        statuses={statuses}
        people={people}
        initialStatus={creating?.status}
        open={creating !== null}
        onOpenChange={(next) => !next && setCreating(null)}
      />
      {record && (
        <TicketSheet
          key={record}
          repo={repo}
          entity={entity}
          ticketId={record}
          people={people}
          onClose={() => navigate({ repo: repo.repo_id, entity: entity.name })}
        />
      )}
    </>
  );
}

interface GroupProps {
  groups: { status: string; tickets: TicketSummary[] }[];
  statuses: readonly string[];
  selected: string | undefined;
  onOpen: (ticket: TicketSummary) => void;
  onStatus: (ticket: TicketSummary, status: string) => void;
  onCreate: (status: string) => void;
}

function TicketTable({ groups, statuses, selected, onOpen, onStatus, onCreate }: GroupProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (status: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col />
          <col className="w-48" />
          <col className="w-44" />
          <col className="w-48" />
        </colgroup>
        <thead className="bg-table-header sticky top-0 sofa-z-index-sticky">
          <tr className="border-b">
            <th className="ui-p2-flush text-muted-foreground h-9 px-3 text-left font-normal">Name</th>
            <th className="ui-p2-flush text-muted-foreground px-3 text-left font-normal">ID</th>
            <th className="ui-p2-flush text-muted-foreground px-3 text-left font-normal">Status</th>
            <th className="ui-p2-flush text-muted-foreground px-3 text-left font-normal">Assignee</th>
          </tr>
        </thead>
        {groups.map((group) => {
          const isCollapsed = collapsed.has(group.status);
          return (
            <tbody key={group.status}>
              <tr className="bg-table-header border-b">
                <td colSpan={4} className="h-9 px-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggle(group.status)}
                      aria-expanded={!isCollapsed}
                      className="hover-neutral flex h-7 items-center gap-2 rounded-md px-1.5"
                    >
                      <ChevronRight
                        className={cn("text-muted-foreground size-3.5", !isCollapsed && "rotate-90")}
                      />
                      <StatusDot status={group.status} statuses={statuses} />
                      <span className="ui-p2-flush text-foreground">{group.status}</span>
                      <span className="ui-p3-flush text-subtle-foreground tabular-nums">
                        {group.tickets.length}
                      </span>
                    </button>
                    <div className="flex-1" />
                    {statuses.includes(group.status) && (
                      <Tooltip content={`New in ${group.status}`}>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground"
                          aria-label={`New ticket in ${group.status}`}
                          onClick={() => onCreate(group.status)}
                        >
                          <Plus />
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                </td>
              </tr>
              {!isCollapsed &&
                group.tickets.map((ticket) => (
                  <tr
                    key={ticket.ticket_id}
                    onClick={() => onOpen(ticket)}
                    aria-selected={ticket.ticket_id === selected}
                    className={cn(
                      "hover-neutral group/title cursor-pointer border-b last:border-b-0",
                      ticket.ticket_id === selected && "bg-accent",
                    )}
                  >
                    <td className="h-10 px-3 pl-9">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpen(ticket);
                        }}
                        className="ui-p2-flush text-foreground group-hover/title:text-primary-accent block w-full truncate text-left outline-none focus-visible:underline"
                      >
                        {ticket.title}
                      </button>
                    </td>
                    <td className="ui-p3-flush font-mono text-muted-foreground truncate px-3">
                      {ticket.ticket_id}
                    </td>
                    <td className="px-3" onClick={(event) => event.stopPropagation()}>
                      <StatusMenu
                        status={ticket.status}
                        statuses={statuses}
                        onChange={(status) => onStatus(ticket, status)}
                      />
                    </td>
                    <td className="px-3">
                      <AssigneeLabel assignee={ticket.assignee} />
                    </td>
                  </tr>
                ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

function TicketBoard({ groups, statuses, selected, onOpen, onStatus, onCreate }: GroupProps) {
  const [dragging, setDragging] = useState<TicketSummary | null>(null);
  const [over, setOver] = useState<string | null>(null);

  return (
    <div className="flex min-h-0 flex-1 gap-3">
      {groups.map((group) => (
        <section
          key={group.status}
          aria-label={group.status}
          onDragOver={(event) => {
            if (!dragging || !statuses.includes(group.status)) return;
            event.preventDefault();
            setOver(group.status);
          }}
          onDragLeave={() => setOver((current) => (current === group.status ? null : current))}
          onDrop={(event) => {
            event.preventDefault();
            if (dragging && dragging.status !== group.status) onStatus(dragging, group.status);
            setDragging(null);
            setOver(null);
          }}
          className={cn(
            "bg-muted flex w-72 shrink-0 flex-col rounded-lg border border-transparent",
            over === group.status && "border-primary-accent",
          )}
        >
          <header className="flex h-10 shrink-0 items-center gap-2 px-3">
            <StatusDot status={group.status} statuses={statuses} />
            <span className="ui-p2-flush text-foreground">{group.status}</span>
            <span className="ui-p3-flush text-subtle-foreground tabular-nums">
              {group.tickets.length}
            </span>
            <div className="flex-1" />
            {statuses.includes(group.status) && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                aria-label={`New ticket in ${group.status}`}
                onClick={() => onCreate(group.status)}
              >
                <Plus />
              </Button>
            )}
          </header>
          <div className="sf-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
            {group.tickets.map((ticket) => (
              <button
                key={ticket.ticket_id}
                type="button"
                draggable
                onDragStart={() => setDragging(ticket)}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
                onClick={() => onOpen(ticket)}
                className={cn(
                  "bg-card hover-neutral group/title flex flex-col gap-2 rounded-md border p-3 text-left shadow-xs outline-none focus-visible:ring-focus-ring focus-visible:ring-[3px]",
                  ticket.ticket_id === selected && "border-primary-accent",
                )}
              >
                <span className="ui-p2 text-foreground group-hover/title:text-primary-accent line-clamp-3">
                  {ticket.title}
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="ui-p3-flush font-mono text-muted-foreground truncate">
                    {ticket.ticket_id}
                  </span>
                  <AssigneeLabel assignee={ticket.assignee} />
                </span>
              </button>
            ))}
            {group.tickets.length === 0 && (
              <p className="ui-p3 text-subtle-foreground px-1 py-2">Drop a card here.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

