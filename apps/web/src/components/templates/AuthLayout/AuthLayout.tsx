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
    // flex (no grid place-items-center): en grid de columna `auto`, `w-full`
    // del hijo resuelve contra su `max-w-*` y desborda en viewports angostos;
    // con flex el `w-full` se acota al ancho del contenedor (el viewport).
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <div
        className={cn(
          'w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg sm:p-8',
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
    </div>
  );
}
