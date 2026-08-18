import type { ReactElement } from 'react';
import { Icon } from '@/components/atoms/Icon';
import { cn } from '@/lib/utils';
import type { StatCardProps } from './StatCard.types';

export function StatCard({
  className,
  label,
  value,
  icon,
  trend,
  ...props
}: StatCardProps): ReactElement {
  return (
    <div
      className={cn('flex flex-col gap-3 rounded-lg border border-border bg-card p-4', className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon ? (
          <span className="grid h-9 w-9 place-items-center rounded-md bg-secondary text-primary">
            <Icon name={icon} size={18} />
          </span>
        ) : null}
      </div>
      <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
      {trend ? (
        <p
          className={cn(
            'text-xs font-semibold',
            trend.direction === 'up'
              ? 'text-success'
              : trend.direction === 'down'
                ? 'text-error'
                : 'text-muted-foreground',
          )}
        >
          {trend.value}
        </p>
      ) : null}
    </div>
  );
}
