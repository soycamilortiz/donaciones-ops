import type { Producto } from '@soschoco/shared';

/**
 * Resolver el texto del OCR contra el catálogo.
 *
 * Tesseract sobre un envase real devuelve texto sucio: "COLGA E TRIPLE ACC ÓN".
 * Por eso el emparejamiento es por tokens y tolera una errata por palabra, en
 * vez de exigir subcadena exacta. Aun así falla con frecuencia, y por eso el
 * llamador exige una confianza mínima antes de escribir el producto en la BD.
 */

/** Minúsculas, sin tildes y sin puntuación: el OCR no es fiable en ninguna. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizar(texto: string): string[] {
  return normalizar(texto)
    .split(' ')
    .filter((token) => token.length >= 3);
}

/** Distancia de edición acotada: solo interesa saber si es 0, 1 o "más de 1". */
export function distanciaAcotada(a: string, b: string, maximo: number): number {
  if (a === b) {
    return 0;
  }
  if (Math.abs(a.length - b.length) > maximo) {
    return maximo + 1;
  }

  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const actual = [i, ...new Array<number>(b.length).fill(0)];
    let mejorFila = actual[0] ?? i;
    for (let j = 1; j <= b.length; j += 1) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      const valor = Math.min(
        (actual[j - 1] ?? 0) + 1,
        (anterior[j] ?? 0) + 1,
        (anterior[j - 1] ?? 0) + costo,
      );
      actual[j] = valor;
      mejorFila = Math.min(mejorFila, valor);
    }
    if (mejorFila > maximo) {
      return maximo + 1;
    }
    anterior = actual;
  }
  return anterior[b.length] ?? maximo + 1;
}

/** Una errata para palabras de 5+ letras; las cortas tienen que ser exactas. */
function coincide(tokenTexto: string, tokenTermino: string): boolean {
  const tolerancia = tokenTermino.length >= 5 ? 1 : 0;
  return distanciaAcotada(tokenTexto, tokenTermino, tolerancia) <= tolerancia;
}

/**
 * Fracción de los tokens del término que aparecen en el texto. Un término de
 * una sola palabra ("colgate") puntúa 1 si esa palabra está; uno de dos
 * ("arroz diana") exige ambas para llegar a 1.
 */
export function puntuarTermino(tokensTexto: string[], termino: string): number {
  const tokensTermino = tokenizar(termino);
  if (tokensTermino.length === 0) {
    return 0;
  }
  const encontrados = tokensTermino.filter((tokenTermino) =>
    tokensTexto.some((tokenTexto) => coincide(tokenTexto, tokenTermino)),
  ).length;
  return encontrados / tokensTermino.length;
}

export type Emparejamiento = {
  producto: Producto;
  puntaje: number;
  /** Palabras del término que acertó. Sirve para desempatar por especificidad. */
  especificidad: number;
};

/** Los términos por los que se puede reconocer un producto. */
function terminosDe(producto: Producto): string[] {
  return [producto.nombre, ...producto.alias, producto.marca ?? ''].filter(
    (termino) => termino.trim() !== '',
  );
}

/**
 * Mejor puntaje de un producto, y cuántas palabras tenía el término que lo
 * consiguió. Entre términos con el mismo puntaje gana el más largo: si tanto
 * "arroz" como "arroz diana" aciertan, el segundo describe mejor lo que se leyó.
 */
function evaluar(tokensTexto: string[], producto: Producto): Emparejamiento {
  let puntaje = 0;
  let especificidad = 0;

  for (const termino of terminosDe(producto)) {
    const actual = puntuarTermino(tokensTexto, termino);
    const palabras = tokenizar(termino).length;
    if (actual > puntaje || (actual === puntaje && palabras > especificidad)) {
      puntaje = actual;
      especificidad = palabras;
    }
  }

  return { producto, puntaje, especificidad };
}

/**
 * Devuelve el mejor candidato, o null si nadie supera el umbral.
 *
 * Ante puntajes iguales gana el emparejamiento más específico: un catálogo real
 * tiene "Arroz" y "Arroz Diana" a la vez, y ambos aciertan al leer
 * "ARROZ DIANA 500 G". Elegir el genérico perdería la marca, y negarse a elegir
 * mandaría a revisión manual algo que se reconoció perfectamente.
 *
 * Solo se devuelve null cuando el empate es real —mismo puntaje y misma
 * especificidad—, porque ahí no hay forma de saber cuál es: mejor un hueco que
 * una marca inventada.
 */
export function emparejar(
  texto: string,
  productos: Producto[],
  umbral: number,
): Emparejamiento | null {
  const tokensTexto = tokenizar(texto);
  if (tokensTexto.length === 0) {
    return null;
  }

  const puntuados = productos
    .map((producto) => evaluar(tokensTexto, producto))
    .filter((item) => item.puntaje >= umbral)
    .sort((a, b) => b.puntaje - a.puntaje || b.especificidad - a.especificidad);

  const mejor = puntuados[0];
  if (!mejor) {
    return null;
  }

  const segundo = puntuados[1];
  const empateReal =
    segundo?.puntaje === mejor.puntaje && segundo?.especificidad === mejor.especificidad;

  return empateReal ? null : mejor;
}
