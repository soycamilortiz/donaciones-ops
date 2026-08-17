import { forwardRef } from 'react';
import { Spinner } from '@/components/atoms/Spinner';
import { cn } from '@/lib/utils';
import type { ButtonProps, ButtonSize, ButtonVariant } from './Button.types';

// `min-h-11`/`min-w-11` = 44px: el minimo tactil. La app se usa con el movil en
// la mano, en campo y muchas veces con guantes o bajo lluvia; alli un boton de
// 36px se falla seguido. El alto visual lo sigue marcando `sizes`, pero el area
// pulsable nunca baja de 44.
// Skin html-base: pastilla (`rounded-pill`), peso fuerte y CTA primario en oro.
const base =
  'appearance-none inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-pill text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-foreground hover:brightness-105 active:brightness-95',
  secondary: 'bg-primary text-primary-foreground hover:bg-primary-panel',
  outline: 'border border-border bg-card text-foreground hover:bg-background',
  ghost: 'text-foreground hover:bg-secondary',
  destructive: 'bg-error text-error-foreground hover:bg-error/90',
  link: 'min-h-0 min-w-0 rounded-none text-primary underline underline-offset-4 hover:brightness-110',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-11 px-4',
  md: 'h-11 px-5',
  lg: 'h-14 px-8 text-base',
  icon: 'h-11 w-11 px-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? <Spinner className="h-4 w-4" aria-hidden /> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
