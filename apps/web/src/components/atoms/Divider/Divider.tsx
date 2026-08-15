import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import type { DividerOrientation, DividerProps } from './Divider.types';

const orientations: Record<DividerOrientation, string> = {
  horizontal: 'h-px w-full bg-border',
  vertical: 'h-full w-px bg-border',
};

export function Divider({
  className,
  orientation = 'horizontal',
  ...props
}: DividerProps): ReactElement {
  return (
    // <hr> ya tiene rol de separador. Se anulan borde y margen del navegador
    // porque el diseño lo dibuja con las utilidades de Tailwind.
    <hr
      aria-orientation={orientation}
      className={cn('m-0 border-0', orientations[orientation], className)}
      {...props}
    />
  );
}
