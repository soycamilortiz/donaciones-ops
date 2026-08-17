import type { ReactElement } from 'react';
import { NavItem } from '@/components/molecules/NavItem';
import { cn } from '@/lib/utils';
import type { SidebarProps } from './Sidebar.types';

export function Sidebar({
  className,
  items,
  header,
  footer,
  ...props
}: SidebarProps): ReactElement {
  return (
    // Skin html-base: panel verde oscuro con logo en crema y navegacion clara.
    <aside
      className={cn('flex h-full w-64 flex-col bg-primary text-primary-foreground', className)}
      {...props}
    >
      {header ? <div className="p-5 text-primary-foreground">{header}</div> : null}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>
      {footer ? (
        <div className="m-3 rounded-md bg-primary-panel p-4 text-primary-foreground">{footer}</div>
      ) : null}
    </aside>
  );
}

Sidebar.displayName = 'Sidebar';
