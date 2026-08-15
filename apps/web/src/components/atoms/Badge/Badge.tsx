import type { ReactElement } from "react";
import { cn } from "@/lib/utils";
import type { BadgeProps, BadgeVariant } from "./Badge.types";

const base =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors";

const variants: Record<BadgeVariant, string> = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  success: "border-transparent bg-success text-success-foreground",
  warning: "border-transparent bg-warning text-warning-foreground",
  error: "border-transparent bg-error text-error-foreground",
  info: "border-transparent bg-info text-info-foreground",
  outline: "border-border text-foreground",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps): ReactElement {
  return (
    <span className={cn(base, variants[variant], className)} {...props} />
  );
}

Badge.displayName = "Badge";
