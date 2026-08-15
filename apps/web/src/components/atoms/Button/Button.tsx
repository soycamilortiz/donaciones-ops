import { forwardRef } from 'react';
import { Spinner } from '@/components/atoms/Spinner';
import { cn } from '@/lib/utils';
import type { ButtonProps, ButtonSize, ButtonVariant } from './Button.types';

const base =
  'appearance-none inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  destructive: 'bg-error text-error-foreground hover:bg-error/90',
  link: 'text-primary underline-offset-4 hover:underline',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3',
  md: 'h-10 px-4 py-2',
  lg: 'h-11 px-8',
  icon: 'h-10 w-10',
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
