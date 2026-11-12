import { ChevronDown, Search, UserRound, UserX } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { StatusChip, StatusDot } from "@/components/StatusChip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FOCUS_RING } from "@/components/ui/focus-ring";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { displayPerson } from "@/lib/entities";
import { cn } from "@/lib/utils";

const triggerClass = cn(
  FOCUS_RING,
  "hover-neutral flex h-7 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left",
);

export function StatusMenu({
  status,
  statuses,
  onChange,
  children,
  align = "start",
}: {
  status: string;
  statuses: readonly string[];
  onChange: (status: string) => void;
  children?: ReactNode;
  align?: "start" | "end";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children ?? (
          <button type="button" className={triggerClass} aria-label={`Status: ${status}`}>
            <StatusChip status={status} statuses={statuses} />
            <ChevronDown className="text-muted-foreground size-3.5" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} onClick={(event) => event.stopPropagation()}>
        <DropdownMenuRadioGroup value={status} onValueChange={onChange}>
          {statuses.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              <StatusDot status={option} statuses={statuses} />
              {option}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AssigneeLabel({ assignee }: { assignee: string | null }) {
  return assignee ? (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={assignee} />
      <span className="ui-p2-flush text-foreground truncate">{displayPerson(assignee)}</span>
    </span>
  ) : (
    <span className="ui-p2-flush text-subtle-foreground flex items-center gap-2">
      <UserRound className="size-4" /> Unassigned
    </span>
  );
}

export function AssigneePicker({
  assignee,
  people,
  onChange,
}: {
  assignee: string | null;
  people: string[];
  onChange: (assignee: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const needle = query.trim();
  const matches = useMemo(
    () => people.filter((person) => person.toLowerCase().includes(needle.toLowerCase())),
    [people, needle],
  );
  const choose = (value: string | null) => {
    onChange(value);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(triggerClass, "max-w-full")} aria-label="Assignee">
          <AssigneeLabel assignee={assignee} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <form
          className="flex items-center gap-2 border-b px-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (needle) choose(needle);
          }}
        >
          <Search className="text-muted-foreground size-4" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Assign to…"
            aria-label="Find or type an assignee"
            className="ui-p2 placeholder:text-subtle-foreground h-10 flex-1 bg-transparent outline-none"
          />
        </form>
        <div className="sf-scrollbar flex max-h-64 flex-col overflow-y-auto p-1">
          <PersonRow onClick={() => choose(null)} selected={assignee === null}>
            <UserX className="text-muted-foreground size-4" /> Unassigned
          </PersonRow>
          {matches.map((person) => (
            <PersonRow key={person} onClick={() => choose(person)} selected={person === assignee}>
              <Avatar name={person} />
              <span className="truncate">{displayPerson(person)}</span>
            </PersonRow>
          ))}
          {needle && !people.some((person) => person.toLowerCase() === needle.toLowerCase()) && (
            <PersonRow onClick={() => choose(needle)} selected={false}>
              <Avatar name={needle} />
              <span className="truncate">Assign “{needle}”</span>
            </PersonRow>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PersonRow({
  children,
  onClick,
  selected,
}: {
  children: ReactNode;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected || undefined}
      className={cn(
        "ui-p2-flush hover-neutral focus-visible:bg-accent flex h-8 w-full items-center gap-2 rounded-md px-2 text-left outline-none",
        selected && "text-primary-accent",
      )}
    >
      {children}
    </button>
  );
}
