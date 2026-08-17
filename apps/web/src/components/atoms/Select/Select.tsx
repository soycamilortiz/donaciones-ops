import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { SelectProps } from './Select.types';

// Gemelo de `Input`: mismo alto tactil de 44px, mismo radio, mismo anillo de
// foco y `text-base` en movil para que iOS no haga zoom al enfocar. Antes cada
// pantalla escribia su propia cadena de clases y ninguna coincidia del todo.
//
// Sin `appearance-none`: la flecha nativa es la unica pista de que el control
// despliega opciones, y quitarla lo dejaba con la misma pinta que un campo de
// texto.
const base =
  'flex h-11 w-full cursor-pointer rounded-md border border-border bg-card px-3.5 py-2 text-base md:text-sm text-foreground ring-offset-background transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const invalidClasses = 'border-error focus-visible:ring-error';

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid = false, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(base, invalid && invalidClasses, className)}
        {...props}
      >
        {children}
      </select>
    );
  },
);

Select.displayName = 'Select';
