import type { ReactElement } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@/components/atoms/Icon';
import { cn } from '@/lib/utils';
import type { NavItemProps } from './NavItem.types';

// Skin html-base: la barra lateral es verde oscuro, asi que los items van en
// crema tenue; el activo pinta el panel verde y el texto en oro.
const base =
  'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors';
const activeCls = 'bg-primary-panel text-accent';
const idleCls =
  'text-primary-foreground/70 hover:bg-primary-panel/60 hover:text-primary-foreground';

export function NavItem({ href, label, icon, active, className }: NavItemProps): ReactElement {
  const { pathname } = useLocation();
  const isActive = active ?? (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <Link
      to={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(base, isActive ? activeCls : idleCls, className)}
    >
      {icon ? <Icon name={icon} size={18} /> : null}
      <span>{label}</span>
    </Link>
  );
}
