import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import type { DataTableProps } from './DataTable.types';

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  caption,
  emptyMessage = 'Todavía no hay nada que mostrar.',
  className,
  rowKey,
}: DataTableProps<T>): ReactElement {
  return (
    <div
      className={cn(
        'ds-datatable w-full overflow-x-auto rounded-lg border border-border bg-card',
        className,
      )}
    >
      <table className="w-full caption-bottom text-sm">
        {caption ? (
          <caption className="mt-4 text-xs text-muted-foreground">{caption}</caption>
        ) : null}
        <thead className="border-b border-border bg-secondary">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'h-11 px-4 text-left align-middle text-xs font-bold uppercase tracking-wider text-muted-foreground',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-6 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={rowKey?.(row, index) ?? claveDe(row, index)}
                className="border-b border-border transition-colors last:border-0 hover:bg-secondary/50"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    data-label={col.header}
                    className={cn(
                      'px-4 py-3.5 align-middle',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.className,
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="ds-cell-label hidden font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      {col.header}
                    </span>
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Si la fila trae un identificador propio se usa ese; si no, se cae al índice.
 * No es ideal, pero deja la puerta abierta a `rowKey` sin romper a quien ya
 * pasa datos sin id.
 */
function claveDe(row: Record<string, unknown>, index: number): string {
  const id = row.id;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : `fila-${index}`;
}
