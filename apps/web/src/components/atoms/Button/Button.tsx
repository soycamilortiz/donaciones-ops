import { forwardRef } from 'react';
import { Spinner } from '@/components/atoms/Spinner';
import { cn } from '@/lib/utils';
import type { ButtonProps, ButtonSize, ButtonVariant } from './Button.types';

// `min-h-11`/`min-w-11` = 44px: el minimo tactil. La app se usa con el movil en
// la mano, en campo y muchas veces con guantes o bajo lluvia; alli un boton de
// 36px se falla seguido. El alto visual lo sigue marcando `sizes`, pero el area
// pulsable nunca baja de 44.
// Skin html-base: pastilla (`rounded-pill`), peso fuerte y CTA primario en oro.
const base =
  'appearance-none inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-pill text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  // Etiqueta en verde tinta sobre la pastilla dorada: html-base usa gold-deep,
  // pero ese par da ~2.6:1 y no pasa WCAG AA. Las reglas de a11y del proyecto
  // mandan sobre el mockup, asi que la etiqueta va en `text-primary` (~8.4:1).
  primary: 'bg-accent text-primary hover:brightness-105 active:brightness-95',
  secondary: 'bg-primary text-primary-foreground hover:bg-primary-panel',
  outline: 'border border-border bg-card text-foreground hover:bg-background',
  ghost: 'text-foreground hover:bg-secondary',
  destructive: 'bg-error text-error-foreground hover:bg-error/90',
  // Conserva `min-h-11` de la base: un enlace-boton suelto tambien se pulsa con
  // guantes. Solo cede el ancho minimo, que en un enlace no aporta nada.
  link: 'min-w-0 rounded-none px-1 text-primary underline underline-offset-4 hover:brightness-110',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-11 px-4',
  md: 'h-11 px-5',
  lg: 'h-14 px-8 text-base',
  icon: 'h-11 w-11 px-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      // Sin `type`, el HTML asume `submit` y cualquier boton dentro de un
      // formulario lo envia al pulsarlo. Los que sí envían lo declaran.
      type = 'button',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? <Spinner className="h-4 w-4" /> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
