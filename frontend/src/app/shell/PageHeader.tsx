import { PanelLeft } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useShell } from "./ShellContext";

export interface Crumb {
  label: string;
  onClick?: () => void;
}

export function PageHeader({ crumbs, actions }: { crumbs: Crumb[]; actions?: ReactNode }) {
  const { sidebarOpen, toggleSidebar } = useShell();
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <Tooltip content={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"} side="bottom">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          aria-label="Toggle sidebar"
          onClick={toggleSidebar}
        >
          <PanelLeft />
        </Button>
      </Tooltip>
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && <span className="ui-p2-flush text-subtle-foreground">/</span>}
              {crumb.onClick && !last ? (
                <button
                  type="button"
                  onClick={crumb.onClick}
                  className="ui-p2-flush text-muted-foreground hover:text-foreground shrink-0 truncate"
                >
                  {crumb.label}
                </button>
              ) : (
                <span
                  className={cn(
                    "ui-p2-flush truncate",
                    last ? "text-foreground" : "text-muted-foreground",
                  )}
                  aria-current={last ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </Fragment>
          );
        })}
      </nav>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </header>
  );
}
