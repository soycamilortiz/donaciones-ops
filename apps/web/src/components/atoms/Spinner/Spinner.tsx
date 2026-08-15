import type { ReactElement } from "react";
import { cn } from "@/lib/utils";
import type { SpinnerProps } from "./Spinner.types";

export function Spinner({
  className,
  label = "Loading",
  ...props
}: SpinnerProps): ReactElement {
  return (
    <svg
      role="status"
      aria-label={label}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-5 w-5 animate-spin text-current", className)}
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        className="opacity-25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  );
}
