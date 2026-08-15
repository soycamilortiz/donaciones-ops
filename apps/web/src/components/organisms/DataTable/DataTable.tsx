import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import type { DataTableProps } from './DataTable.types';

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  caption,
  emptyMessage = 'No data.',
  className,
  rowKey,
}: DataTableProps<T>): ReactElement {
  return (
    <div className={cn('w-full overflow-x-auto rounded-lg border border-border', className)}>
      <table className="w-full caption-bottom text-sm">
        {caption ? (
          <caption className="mt-4 text-xs text-muted-foreground">{caption}</caption>
        ) : null}
        <thead className="border-b border-border bg-muted/50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'h-11 px-4 text-left align-middle font-medium text-muted-foreground',
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
                className="border-b border-border transition-colors hover:bg-muted/50"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 align-middle',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.className,
                    )}
                  >
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
