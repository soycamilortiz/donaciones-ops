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
  const dialogoRef = useRef<HTMLDivElement>(null);
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
        return;
      }
      if (evento.key !== 'Tab') {
        return;
      }

      // Retiene el foco dentro del diálogo. Sin esto, tabular desde el último
      // botón sale a la página de detrás: se puede operar contenido que está
      // visualmente bloqueado, y no hay forma de saber dónde quedó el foco.
      const dentro = dialogoRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!dentro || dentro.length === 0) {
        return;
      }
      const primero = dentro[0];
      const ultimo = dentro[dentro.length - 1];
      if (!primero || !ultimo) {
        return;
      }

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
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
        ref={dialogoRef}
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
