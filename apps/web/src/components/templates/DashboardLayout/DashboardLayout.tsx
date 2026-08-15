import type { ReactElement } from 'react';
import { Icon } from '@/components/atoms/Icon';
import { Header } from '@/components/organisms/Header';
import type { SidebarItem } from '@/components/organisms/Sidebar';
import { Sidebar } from '@/components/organisms/Sidebar';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { DashboardLayoutProps } from './DashboardLayout.types';

const defaultNavItems: SidebarItem[] = [
  { href: ROUTES.home, label: 'Dashboard', icon: 'home' },
  { href: ROUTES.donaciones, label: 'Donaciones', icon: 'heart' },
];

export function DashboardLayout({
  children,
  navItems = defaultNavItems,
  className,
}: DashboardLayoutProps): ReactElement {
  return (
    <div className="flex h-full min-h-screen">
      <Sidebar
        items={navItems}
        className="hidden md:flex"
        header={
          <span className="flex items-center gap-2 font-semibold">
            <Icon name="heart" className="text-primary" />
            {APP_NAME}
          </span>
        }
      />
      <div className="flex flex-1 flex-col">
        <Header sticky />
        <main className={cn('flex-1 overflow-y-auto p-6', className)}>{children}</main>
      </div>
    </div>
  );
}
