import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import type { BadgeProps, BadgeVariant } from './Badge.types';

// Skin html-base: pastillas «soft» — fondo tenue + texto del color de estado.
const base =
  'inline-flex items-center rounded-pill px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors';

const variants: Record<BadgeVariant, string> = {
  default: 'bg-secondary text-muted-foreground',
  secondary: 'bg-muted text-foreground',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-error-soft text-error',
  info: 'bg-info-soft text-info',
  outline: 'border border-border text-foreground',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps): ReactElement {
  return <span className={cn(base, variants[variant], className)} {...props} />;
}

Badge.displayName = 'Badge';
