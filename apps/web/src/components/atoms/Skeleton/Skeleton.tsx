import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import type { SkeletonListProps, SkeletonProps } from './Skeleton.types';

/**
 * Hueco que ocupa el sitio del contenido mientras llega.
 *
 * Antes las listas se pintaban vacías durante la carga, lo que es ambiguo: no
 * se distingue "cargando" de "no hay nada". Y al llegar los datos la página
 * saltaba. El esqueleto resuelve las dos cosas: comunica que algo viene y
 * reserva el espacio que va a ocupar.
 *
 * `aria-hidden` porque es decorativo; quien use lector de pantalla se entera
 * por el `role="status"` del contenedor, no por estas cajas.
 */
export function Skeleton({ className }: SkeletonProps): ReactElement {
  return (
    <span aria-hidden="true" className={cn('block animate-pulse rounded bg-muted', className)} />
  );
}

/**
 * Varias filas de esqueleto con el anuncio accesible ya puesto. Es lo que se
 * usa en las listas; `Skeleton` suelto solo para casos a medida.
 */
export function SkeletonList({
  filas = 3,
  className,
  etiqueta = 'Cargando…',
}: SkeletonListProps): ReactElement {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={cn('space-y-3', className)}>
      <span className="sr-only">{etiqueta}</span>
      {Array.from({ length: filas }, (_, i) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: son cajas identicas sin identidad propia y la lista nunca se reordena ni se filtra.
          key={`fila-${i}`}
          className="h-16 w-full"
        />
      ))}
    </div>
  );
}
