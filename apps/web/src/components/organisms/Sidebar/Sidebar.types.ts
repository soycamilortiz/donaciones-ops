import type { HTMLAttributes, ReactNode } from 'react';
import type { IconName } from '@/components/atoms/Icon';

export type SidebarItem = {
  href: string;
  label: string;
  icon?: IconName;
};

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  items: SidebarItem[];
  header?: ReactNode;
  footer?: ReactNode;
}
