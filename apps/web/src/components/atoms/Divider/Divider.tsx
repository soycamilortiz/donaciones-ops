import type { ReactElement } from "react";
import { cn } from "@/lib/utils";
import type { DividerOrientation, DividerProps } from "./Divider.types";

const orientations: Record<DividerOrientation, string> = {
  horizontal: "h-px w-full bg-border",
  vertical: "h-full w-px bg-border",
};

export function Divider({
  className,
  orientation = "horizontal",
  ...props
}: DividerProps): ReactElement {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(orientations[orientation], className)}
      {...props}
    />
  );
}
