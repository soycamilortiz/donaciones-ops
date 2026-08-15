import { reconocerProductoJob } from './reconocer-producto.js';
import type { DefinicionJob } from './tipos.js';

/**
 * Los jobs que este worker atiende. Para añadir uno nuevo: crea el archivo en
 * esta carpeta exportando una `DefinicionJob` y súmalo a esta lista. El manager
 * levanta un Worker de BullMQ por cada entrada.
 */
// biome-ignore lint/suspicious/noExplicitAny: cada job tiene su propio payload; el manager solo necesita la forma común.
export const JOBS: DefinicionJob<any>[] = [reconocerProductoJob];
