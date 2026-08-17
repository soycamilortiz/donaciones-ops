import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import type { FormFieldProps } from './FormField.types';

export function FormField({
  className,
  label,
  htmlFor,
  error,
  hint,
  required = false,
  children,
  ...props
}: FormFieldProps): ReactElement {
  return (
    <div className={cn('space-y-1.5', className)} {...props}>
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-bold uppercase leading-none tracking-wide text-muted-foreground"
      >
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
