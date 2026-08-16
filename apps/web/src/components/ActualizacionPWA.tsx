import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';

/**
 * Aviso de nueva versión y de disponibilidad offline.
 *
 * El registro es `prompt` y no `autoUpdate` a propósito: recargar sola la app
 * mientras alguien está subiendo una foto en campo perdería el trabajo en curso.
 */
export default function ActualizacionPWA() {
  const { t } = useTranslation();
  const {
    offlineReady: [listaOffline, setListaOffline],
    needRefresh: [hayVersionNueva, setHayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW();

  if (!listaOffline && !hayVersionNueva) {
    return null;
  }

  const cerrar = () => {
    setListaOffline(false);
    setHayVersionNueva(false);
  };

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-lg"
    >
      <p className="text-sm text-foreground">
        {hayVersionNueva ? t('pwa.updateAvailable') : t('pwa.offlineReady')}
      </p>
      <div className="flex gap-2">
        {hayVersionNueva ? (
          <Button onClick={() => void updateServiceWorker(true)}>{t('pwa.update')}</Button>
        ) : null}
        <Button variant="outline" onClick={cerrar}>
          {t('common.close')}
        </Button>
      </div>
    </div>
  );
}
