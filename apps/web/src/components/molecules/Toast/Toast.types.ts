export type ToastTono = 'exito' | 'error';

export type Toast = {
  id: number;
  mensaje: string;
  tono: ToastTono;
};

export type ToastContextValue = {
  /** Anuncia el resultado de una escritura. `error` no se auto-descarta. */
  avisar: (mensaje: string, tono?: ToastTono) => void;
};
