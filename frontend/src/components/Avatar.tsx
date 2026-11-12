import { initials } from "@/lib/entities";
import { cn } from "@/lib/utils";

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-muted text-muted-foreground ui-micro inline-flex size-5 shrink-0 items-center justify-center rounded-sm border",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
