import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import type { SpinnerProps } from './Spinner.types';

/**
 * Sin `label` el spinner es decorativo: casi siempre lo acompaña un texto que ya
 * anuncia el estado, y marcarlo como `role="status"` metía una región viva
 * dentro de otra (doble anuncio) con una etiqueta en inglés dentro de una
 * interfaz en español. Quien lo use suelto le pasa su propia etiqueta traducida.
 */
export function Spinner({ className, label, ...props }: SpinnerProps): ReactElement {
  return (
    <svg
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('h-5 w-5 animate-spin text-current', className)}
      {...props}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
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
