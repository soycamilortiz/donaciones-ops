import type { ReactElement } from 'react';
import { Icon } from '@/components/atoms/Icon';
import { cn } from '@/lib/utils';
import type { AvatarProps, AvatarSize } from './Avatar.types';

// Skin html-base: disco con degradado verde e iniciales en crema.
const base =
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary-panel to-primary text-primary-foreground font-bold select-none';

const sizes: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function Avatar({
  className,
  src,
  alt,
  fallback,
  size = 'md',
  ...props
}: AvatarProps): ReactElement {
  return (
    // Sin role="img" el aria-label sobre un span se ignora: el lector de
    // pantalla no anunciaría nada cuando se cae al fallback o al icono.
    <span role="img" aria-label={alt} className={cn(base, sizes[size], className)} {...props}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : fallback ? (
        fallback
      ) : (
        <Icon name="user" />
      )}
    </span>
  );
}
