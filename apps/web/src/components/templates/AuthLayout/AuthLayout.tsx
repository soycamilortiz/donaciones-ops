import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import logoMark from '@/assets/logo-mark.png';
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
    // Skin html-base: fondo salvia, tarjeta centrada (<=460px) radio 20px.
    <main className="grid min-h-screen place-items-center bg-background p-4 sm:p-6">
      <div
        className={cn(
          'w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg sm:p-8',
          className,
        )}
      >
        <Link
          to={ROUTES.home}
          aria-label={`${APP_NAME} — inicio`}
          className="mb-6 flex justify-center"
        >
          <img src={logoMark} alt={APP_NAME} className="h-11 w-auto" />
        </Link>
        {title ? (
          <h1 className="text-center text-3xl font-semibold tracking-tight text-primary">
            {title}
          </h1>
        ) : null}
        {subtitle ? (
          <p className="mt-1 text-center text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
