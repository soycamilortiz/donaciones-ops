import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  key: keyof T & string;
  header: string;
  align?: "left" | "center" | "right";
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  columns: DataTableColumn<T>[];
  data: T[];
  caption?: string;
  emptyMessage?: string;
  className?: string;
}
