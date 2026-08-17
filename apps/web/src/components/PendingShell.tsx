import { useTranslation } from 'react-i18next';
import { Link, Outlet, useOutletContext } from 'react-router-dom';
import logoMark from '@/assets/logo-mark.png';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { useSession } from '../lib/AuthProvider';
import type { Me } from '../lib/api';

type PendingContext = { me: Me; refresh: () => Promise<void> };

export default function PendingShell() {
  const { t } = useTranslation();
  const { logout } = useSession();
  const context = useOutletContext<PendingContext>();

  return (
    // Skin html-base: fondo salvia, topbar calma con logo + salir, contenido centrado.
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <Link to={ROUTES.home} aria-label={`${APP_NAME} — inicio`}>
            <img src={logoMark} alt={APP_NAME} className="h-9 w-auto" />
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={logout}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Icon name="logout" size={16} />
            {t('common.signOut')}
          </Button>
        </div>
      </header>
      <main>
        <Outlet context={context} />
      </main>
    </div>
  );
}
