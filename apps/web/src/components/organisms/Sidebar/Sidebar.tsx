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
    <aside
      className={cn('flex h-full w-64 flex-col border-r border-border bg-card', className)}
      {...props}
    >
      {header ? <div className="border-b border-border p-4">{header}</div> : null}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>
      {footer ? <div className="border-t border-border p-4">{footer}</div> : null}
    </aside>
  );
}

Sidebar.displayName = 'Sidebar';
