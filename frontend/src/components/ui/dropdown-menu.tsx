import { DropdownMenu as Menu } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuRadioGroup = Menu.RadioGroup;

export function DropdownMenuContent({
  className,
  sideOffset = 4,
  align = "start",
  ...props
}: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "bg-popover text-popover-foreground sofa-z-index-portal min-w-48 overflow-hidden rounded-lg border p-1 shadow-md",
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

const itemClass =
  "ui-p2-flush hover-neutral focus:bg-accent relative flex h-8 cursor-default items-center gap-2 rounded-md px-2 outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 [&_svg:not([class*='text-'])]:text-muted-foreground";

export function DropdownMenuItem({
  className,
  variant,
  ...props
}: ComponentProps<typeof Menu.Item> & { variant?: "destructive" }) {
  return (
    <Menu.Item
      className={cn(
        itemClass,
        variant === "destructive" &&
          "text-destructive-accent focus:text-destructive-accent [&_svg:not([class*='text-'])]:text-destructive-accent",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem className={cn(itemClass, "pr-8", className)} {...props}>
      {children}
      <Menu.ItemIndicator className="bg-primary-accent absolute right-2.5 size-1.5 rounded-full" />
    </Menu.RadioItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return (
    <Menu.Label
      className={cn("ui-p3-flush text-muted-foreground px-2 py-1.5", className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn("bg-border -mx-1 my-1 h-px", className)} {...props} />;
}
