import { reconocerProductoJob } from './reconocer-producto.js';
import type { DefinicionJob } from './tipos.js';

/**
 * Los jobs que este worker atiende. Para añadir uno nuevo: crea el archivo en
 * esta carpeta exportando una `DefinicionJob` y súmalo a esta lista. El manager
 * levanta un Worker de BullMQ por cada entrada.
 */
// `any` es deliberado: la lista es heterogénea (cada job trae su propio
// payload) y el manager solo necesita la forma común.
export const JOBS: DefinicionJob<any>[] = [reconocerProductoJob];
