import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: keyof T & string;
  header: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  columns: DataTableColumn<T>[];
  data: T[];
  caption?: string;
  emptyMessage?: string;
  className?: string;
  /**
   * Clave estable de cada fila. Sin esto se usa el índice, que hace que React
   * reutilice mal las filas cuando la lista se reordena o se filtra.
   */
  rowKey?: (row: T, index: number) => string;
}
