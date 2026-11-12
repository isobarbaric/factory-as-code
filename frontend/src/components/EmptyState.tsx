import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}>
      <Icon className="text-subtle-foreground size-6" aria-hidden="true" />
      <div className="flex max-w-sm flex-col gap-1">
        <p className="ui-p2 text-foreground font-medium">{title}</p>
        {description && <p className="ui-p2 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
