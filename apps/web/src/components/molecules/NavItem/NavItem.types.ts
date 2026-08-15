import type { IconName } from "@/components/atoms/Icon";

export interface NavItemProps {
  href: string;
  label: string;
  icon?: IconName;
  active?: boolean;
  className?: string;
}
