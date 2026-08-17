import type { SVGProps } from 'react';

/** Names of the inline SVGs registered in the Icon atom. */
export type IconName =
  | 'menu'
  | 'close'
  | 'search'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevronRight'
  | 'check'
  | 'user'
  | 'home'
  | 'settings'
  | 'bell'
  | 'plus'
  | 'trash'
  | 'external-link'
  | 'alert-circle'
  | 'info'
  | 'logout'
  | 'heart'
  // html-base glyph set (Feather-style, stroke 2.2, round caps)
  | 'grid'
  | 'users'
  | 'shield'
  | 'package'
  | 'camera'
  | 'arrowRight'
  | 'arrowLeft'
  | 'x'
  | 'refresh'
  | 'lock'
  | 'alert'
  | 'triangle'
  | 'globe'
  | 'mail'
  | 'book'
  | 'clock'
  | 'swap'
  | 'wifiOff'
  | 'calendar';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Pixel size applied to width & height. Defaults to 20. */
  size?: number;
  /** Accessible label. When omitted the icon is hidden from assistive tech. */
  title?: string;
}
