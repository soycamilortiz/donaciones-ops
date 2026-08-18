import { cloneElement, isValidElement, type ReactElement, useId } from 'react';
import { cn } from '@/lib/utils';
import type { FormFieldProps } from './FormField.types';

/** ARIA attributes the field wires into whatever control it wraps. */
type ControlAria = {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-required'?: boolean;
};

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
  const baseId = useId();
  const errorId = `${baseId}-error`;
  const hintId = `${baseId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  // The message is only announced once by role="alert". Tying it to the control
  // is what lets someone hear it again when they tab back to fix the field —
  // the usual order on a phone, where fields are corrected out of sequence.
  // Only ARIA goes through: `invalid` and other component props would land as
  // unknown attributes on the native <select> and <textarea> children.
  const control = isValidElement<ControlAria>(children)
    ? cloneElement(children, {
        ...(describedBy
          ? {
              'aria-describedby': [children.props['aria-describedby'], describedBy]
                .filter(Boolean)
                .join(' '),
            }
          : {}),
        ...(error ? { 'aria-invalid': true } : {}),
        ...(required ? { 'aria-required': children.props['aria-required'] ?? true } : {}),
      })
    : children;

  return (
    <div className={cn('space-y-1.5', className)} {...props}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-bold uppercase leading-none tracking-wide text-muted-foreground"
      >
        {label}
        {/* aria-required on the control already says it; the asterisk is visual. */}
        {required ? (
          <span aria-hidden="true" className="text-error">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {control}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
