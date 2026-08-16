import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

function normalizarDigitos(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 8 && digits.length <= 14) {
    return digits;
  }
  return null;
}

async function leerConBarcodeDetector(archivo: File): Promise<string | null> {
  const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!Ctor) {
    return null;
  }
  try {
    const bitmap = await createImageBitmap(archivo);
    const detector = new Ctor({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    const hits = await detector.detect(bitmap);
    bitmap.close();
    const valor = hits[0]?.rawValue;
    return valor ? normalizarDigitos(valor) : null;
  } catch {
    return null;
  }
}

async function leerConZxing(archivo: File): Promise<string | null> {
  const url = URL.createObjectURL(archivo);
  try {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);
    const result = await reader.decodeFromImageUrl(url);
    return normalizarDigitos(result.getText());
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Tries native BarcodeDetector first, then ZXing (desktop / tough photos).
 */
export async function leerEanDeFoto(archivo: File): Promise<string | null> {
  return (await leerConBarcodeDetector(archivo)) ?? (await leerConZxing(archivo));
}
