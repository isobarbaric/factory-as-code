import { statusClasses } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusDot({ status, statuses }: { status: string; statuses: readonly string[] }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2 shrink-0 rounded-full", statusClasses(status, statuses).dot)}
    />
  );
}

export function StatusChip({
  status,
  statuses,
  className,
}: {
  status: string;
  statuses: readonly string[];
  className?: string;
}) {
  return (
    <span
      className={cn(
        "ui-p3-flush inline-flex h-5 max-w-full items-center gap-1.5 rounded-sm px-1.5 whitespace-nowrap",
        statusClasses(status, statuses).chip,
        className,
      )}
    >
      <StatusDot status={status} statuses={statuses} />
      <span className="truncate">{status}</span>
    </span>
  );
}
