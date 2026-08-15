import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/atoms/Icon';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { FooterProps } from './Footer.types';

export function Footer({ className, ...props }: FooterProps): ReactElement {
  return (
    <footer className={cn('border-t border-border bg-background', className)} {...props}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <Icon name="heart" className="text-primary" />
          {APP_NAME}
        </div>
        <nav className="flex gap-6 text-sm text-muted-foreground">
          <Link to={ROUTES.home} className="hover:text-foreground">
            Dashboard
          </Link>
          <Link to={ROUTES.donaciones} className="hover:text-foreground">
            Donaciones
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}.
        </p>
      </div>
    </footer>
  );
}
