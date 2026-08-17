import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { InputProps } from './Input.types';

// Skin html-base: campo blanco, radio 12px (`rounded-md`), borde `line`, alto
// tactil de 44px y foco con anillo verde.
// `text-base md:text-sm`: 16px en movil evita el zoom forzado de iOS Safari al
// enfocar el campo; baja a 14px recien en desktop.
const base =
  'appearance-none flex h-11 w-full rounded-md border border-border bg-card px-3.5 py-2 text-base md:text-sm text-foreground ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const invalidClasses = 'border-error focus-visible:ring-error';

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

Input.displayName = 'Input';
