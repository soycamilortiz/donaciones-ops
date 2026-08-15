import type { HTMLAttributes } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  src?: string;
  alt: string;
  fallback?: string;
  size?: AvatarSize;
}
