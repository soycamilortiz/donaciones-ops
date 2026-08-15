import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { InputProps } from "./Input.types";

const base =
  "appearance-none flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const invalidClasses = "border-error focus-visible:ring-error";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid = false, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        aria-invalid={invalid || undefined}
        className={cn(base, invalid && invalidClasses, className)}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
