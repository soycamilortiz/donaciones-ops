import type { ReactNode } from "react";
import type { SidebarItem } from "@/components/organisms/Sidebar";

export interface DashboardLayoutProps {
  children: ReactNode;
  navItems?: SidebarItem[];
  className?: string;
}
