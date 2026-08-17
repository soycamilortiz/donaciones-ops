import { createContext, type ReactElement, type ReactNode, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/atoms/Icon';
import { cn } from '@/lib/utils';
import type { Toast, ToastContextValue, ToastTono } from './Toast.types';

export const ToastContext = createContext<ToastContextValue | null>(null);

const DURACION_MS = 4000;
const MAXIMO = 3;

/**
 * Confirmación efímera de que una escritura entró.
 *
 * Hasta ahora invitar a alguien, cambiar un rol o guardar un producto no decían
 * nada al terminar: en campo, con la conexión intermitente, quien no ve
 * respuesta vuelve a pulsar y dispara la misma petición dos veces.
 *
 * La región es `aria-live="polite"` y vive fuera de las pantallas, así que el
 * aviso se anuncia aunque el control que lo disparó ya no esté en el DOM. Los
 * errores no se descartan solos: un fallo que desaparece a los cuatro segundos
 * es casi igual de invisible que no mostrarlo.
 */
export function ToastProvider({ children }: { children: ReactNode }): ReactElement {
  const { t } = useTranslation();
  const [avisos, setAvisos] = useState<Toast[]>([]);

  const descartar = useCallback((id: number) => {
    setAvisos((actuales) => actuales.filter((aviso) => aviso.id !== id));
  }, []);

  const avisar = useCallback(
    (mensaje: string, tono: ToastTono = 'exito') => {
      const id = Date.now() + Math.random();
      setAvisos((actuales) => [...actuales, { id, mensaje, tono }].slice(-MAXIMO));
      if (tono === 'exito') {
        window.setTimeout(() => descartar(id), DURACION_MS);
      }
    },
    [descartar],
  );

  return (
    <ToastContext.Provider value={{ avisar }}>
      {children}
      <div
        // `role="status"` ya implica live polite; el atributo explícito es para
        // los lectores que no lo mapean.
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {avisos.map((aviso) => (
          <output
            key={aviso.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg',
              aviso.tono === 'error'
                ? 'border-error bg-error-soft text-foreground'
                : 'border-success bg-card text-foreground',
            )}
          >
            <Icon
              name={aviso.tono === 'error' ? 'alert-circle' : 'check'}
              size={18}
              className={cn(
                'mt-0.5 shrink-0',
                aviso.tono === 'error' ? 'text-error' : 'text-success',
              )}
            />
            <span className="flex-1 font-medium">{aviso.mensaje}</span>
            <button
              type="button"
              onClick={() => descartar(aviso.id)}
              aria-label={t('common.close')}
              className="-m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon name="x" size={16} />
            </button>
          </output>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
