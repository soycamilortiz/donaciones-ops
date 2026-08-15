import type { ReactElement } from 'react';
import { Footer } from '@/components/organisms/Footer';
import { Header } from '@/components/organisms/Header';
import type { LandingLayoutProps } from './LandingLayout.types';

export function LandingLayout({ children }: LandingLayoutProps): ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <Header sticky />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
