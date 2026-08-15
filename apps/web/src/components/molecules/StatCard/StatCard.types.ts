import type { HTMLAttributes } from 'react';
import type { IconName } from '@/components/atoms/Icon';

export type StatTrend = {
  value: string;
  direction: 'up' | 'down' | 'neutral';
};

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  icon?: IconName;
  trend?: StatTrend;
}
