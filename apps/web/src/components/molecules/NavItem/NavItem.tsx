import type { ReactElement } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@/components/atoms/Icon';
import { cn } from '@/lib/utils';
import type { NavItemProps } from './NavItem.types';

const base = 'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors';
const activeCls = 'bg-accent text-accent-foreground';
const idleCls = 'text-muted-foreground hover:bg-accent hover:text-accent-foreground';

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
