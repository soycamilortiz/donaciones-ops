import { type ReactElement, useEffect, useId, useRef } from 'react';
import { Button } from '@/components/atoms/Button';
import type { ConfirmDialogProps } from './ConfirmDialog.types';

/**
 * Confirmación para acciones que no se pueden deshacer.
 *
 * Existe porque eliminar un acopio, un rol o dar de baja a un miembro se hacía
 * con un solo clic y sin vuelta atrás. En un móvil, en campo, un roce basta.
 *
 * Enfoca el botón de cancelar al abrir —no el destructivo— para que pulsar
 * Enter por inercia no borre nada, y devuelve el foco a donde estaba al cerrar.
 */
export function ConfirmDialog({
  abierto,
  titulo,
  descripcion,
  etiquetaConfirmar = 'Eliminar',
  etiquetaCancelar = 'Cancelar',
  destructivo = true,
  ocupado = false,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps): ReactElement | null {
  const tituloId = useId();
  const descripcionId = useId();
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const origenRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    // Quién tenía el foco antes de abrir, para devolvérselo al cerrar.
    origenRef.current = document.activeElement as HTMLElement | null;
    cancelarRef.current?.focus();

    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        onCancelar();
      }
    };
    document.addEventListener('keydown', alPulsar);

    return () => {
      document.removeEventListener('keydown', alPulsar);
      origenRef.current?.focus();
    };
  }, [abierto, onCancelar]);

  if (!abierto) {
    return null;
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: el fondo es decorativo; cerrar al pincharlo es comodidad de ratón y el camino de teclado es Escape.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) {
          onCancelar();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descripcion ? descripcionId : undefined}
        className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-6 shadow-lg"
      >
        <h2 id={tituloId} className="text-lg font-semibold text-foreground">
          {titulo}
        </h2>

        {descripcion ? (
          <p id={descripcionId} className="text-sm text-muted-foreground">
            {descripcion}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Button ref={cancelarRef} variant="outline" onClick={onCancelar} disabled={ocupado}>
            {etiquetaCancelar}
          </Button>
          <Button
            variant={destructivo ? 'destructive' : 'primary'}
            onClick={onConfirmar}
            disabled={ocupado}
          >
            {ocupado ? 'Procesando…' : etiquetaConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
