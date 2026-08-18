export type ToastTono = 'exito' | 'error';

export type ToastAccion = {
  etiqueta: string;
  alPulsar: () => void;
};

export type Toast = {
  id: number;
  mensaje: string;
  tono: ToastTono;
  accion?: ToastAccion;
};

export type ToastContextValue = {
  /**
   * Anuncia el resultado de una escritura. `error` no se auto-descarta, y con
   * `accion` tampoco: un «Deshacer» que se va solo no sirve de nada.
   */
  avisar: (mensaje: string, opciones?: { tono?: ToastTono; accion?: ToastAccion }) => void;
};
