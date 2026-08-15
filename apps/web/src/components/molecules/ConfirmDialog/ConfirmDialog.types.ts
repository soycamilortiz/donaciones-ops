export interface ConfirmDialogProps {
  abierto: boolean;
  titulo: string;
  /** Qué consecuencia tiene confirmar. Conviene ser concreto: se borra sin vuelta atrás. */
  descripcion?: string;
  etiquetaConfirmar?: string;
  etiquetaCancelar?: string;
  /** Pinta el botón de confirmar como peligroso. Por defecto sí: es su caso de uso. */
  destructivo?: boolean;
  /** Bloquea los botones mientras la petición está en vuelo. */
  ocupado?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}
