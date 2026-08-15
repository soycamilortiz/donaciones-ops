import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/atoms/Icon';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { AuthLayoutProps } from './AuthLayout.types';

export function AuthLayout({
  children,
  title,
  subtitle,
  className,
}: AuthLayoutProps): ReactElement {
  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-6">
      <div
        className={cn(
          'w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg',
          className,
        )}
      >
        <Link
          to={ROUTES.home}
          className="mb-6 flex items-center justify-center gap-2 font-semibold"
        >
          <Icon name="heart" className="text-primary" />
          {APP_NAME}
        </Link>
        {title ? (
          <h1 className="text-center text-2xl font-semibold text-card-foreground">{title}</h1>
        ) : null}
        {subtitle ? (
          <p className="mt-1 text-center text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
