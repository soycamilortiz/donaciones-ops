import { spawn } from 'node:child_process';
import sharp from 'sharp';

/** Texto reconocido antes de resolverlo contra el catálogo de productos. */
export type TextoReconocido = {
  texto: string;
  /** 0..1 */
  confianza: number;
};

export type TesseractOpciones = {
  idiomas: string;
  timeoutMs: number;
};

/**
 * Tesseract acierta mucho más sobre una imagen plana y grande que sobre un JPEG
 * de móvil. Escala de grises, normalizado de contraste y un ancho mínimo son
 * las tres cosas que más mueven la aguja; el `sharpen` ayuda con el desenfoque
 * leve típico de una foto tomada de cerca.
 */
export async function preprocesar(imagen: Buffer): Promise<Buffer> {
  return sharp(imagen)
    .rotate() // respeta la orientación EXIF del móvil
    .greyscale()
    .normalise()
    .resize({ width: 1600, withoutEnlargement: false, fit: 'inside' })
    .sharpen()
    .png()
    .toBuffer();
}

/**
 * Ejecuta el binario de Tesseract leyendo de stdin y escribiendo TSV a stdout.
 * Se usa TSV en vez de texto plano porque trae la confianza por palabra, que es
 * lo único que permite decidir si el resultado es fiable.
 */
export async function ejecutarTesseract(
  imagen: Buffer,
  opciones: TesseractOpciones,
): Promise<TextoReconocido> {
  const tsv = await spawnTesseract(imagen, opciones);
  return interpretarTsv(tsv);
}

function spawnTesseract(imagen: Buffer, opciones: TesseractOpciones): Promise<string> {
  return new Promise((resolve, reject) => {
    const proceso = spawn(
      'tesseract',
      ['stdin', 'stdout', '-l', opciones.idiomas, '--psm', '6', 'tsv'],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );

    let stdout = '';
    let stderr = '';
    let cerrado = false;

    const temporizador = setTimeout(() => {
      cerrado = true;
      proceso.kill('SIGKILL');
      reject(new Error(`Tesseract excedió ${opciones.timeoutMs}ms`));
    }, opciones.timeoutMs);

    proceso.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    proceso.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    proceso.on('error', (error) => {
      clearTimeout(temporizador);
      if (!cerrado) {
        reject(new Error(`No se pudo ejecutar tesseract: ${error.message}`));
      }
    });

    proceso.on('close', (code) => {
      clearTimeout(temporizador);
      if (cerrado) {
        return;
      }
      if (code !== 0) {
        reject(new Error(`Tesseract salió con código ${code}: ${stderr.trim()}`));
        return;
      }
      resolve(stdout);
    });

    proceso.stdin.on('error', () => {
      /* si el proceso muere antes de leer, ya lo reporta 'error' o 'close' */
    });
    proceso.stdin.end(imagen);
  });
}

const COLUMNA_CONF = 10;
const COLUMNA_TEXTO = 11;

/**
 * El TSV trae una fila por palabra. `conf` va de -1 (bloque sin texto) a 100;
 * se descartan las filas sin palabra y se promedia el resto.
 */
export function interpretarTsv(tsv: string): TextoReconocido {
  const palabras: string[] = [];
  const confianzas: number[] = [];

  const lineas = tsv.split('\n').slice(1); // la primera es la cabecera
  for (const linea of lineas) {
    const celdas = linea.split('\t');
    if (celdas.length <= COLUMNA_TEXTO) {
      continue;
    }
    const texto = (celdas[COLUMNA_TEXTO] ?? '').trim();
    const conf = Number.parseFloat(celdas[COLUMNA_CONF] ?? '-1');
    if (texto === '' || !Number.isFinite(conf) || conf < 0) {
      continue;
    }
    palabras.push(texto);
    confianzas.push(conf);
  }

  if (palabras.length === 0) {
    return { texto: '', confianza: 0 };
  }

  const media = confianzas.reduce((total, valor) => total + valor, 0) / confianzas.length;
  return { texto: palabras.join(' '), confianza: media / 100 };
}
