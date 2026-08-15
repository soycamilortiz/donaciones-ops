import type { SVGProps } from 'react';

export interface SpinnerProps extends SVGProps<SVGSVGElement> {
  /** Accessible label announced to assistive tech. */
  label?: string;
}
