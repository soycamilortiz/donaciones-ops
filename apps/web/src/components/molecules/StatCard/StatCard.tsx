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
      className={cn('rounded-lg border border-border bg-card p-5 shadow-sm', className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? (
          <span className="grid h-9 w-9 place-items-center rounded-md bg-muted text-muted-foreground">
            <Icon name={icon} size={18} />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold text-card-foreground">{value}</p>
      {trend ? (
        <p
          className={cn(
            'mt-1 text-xs font-medium',
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
