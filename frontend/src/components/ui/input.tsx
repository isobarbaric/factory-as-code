import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "ui-p2 placeholder:text-subtle-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-focus-ring focus-visible:ring-[3px]",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "ui-p2 placeholder:text-subtle-foreground dark:bg-input/30 border-input flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 shadow-xs outline-none disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-focus-ring focus-visible:ring-[3px]",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("ui-p2-flush text-foreground", className)} {...props} />;
}
