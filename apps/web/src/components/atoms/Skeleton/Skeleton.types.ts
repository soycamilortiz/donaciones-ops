export interface SkeletonProps {
  className?: string;
}

export interface SkeletonListProps {
  /** Cuántas filas fingir. Conviene aproximar lo que suele traer la lista. */
  filas?: number;
  className?: string;
  /** Lo que anuncia el lector de pantalla mientras carga. */
  etiqueta?: string;
}
