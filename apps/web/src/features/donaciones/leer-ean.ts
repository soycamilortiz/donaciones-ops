type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

export async function leerEanDeFoto(archivo: File): Promise<string | null> {
  const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!Ctor) {
    return null;
  }
  try {
    const bitmap = await createImageBitmap(archivo);
    const detector = new Ctor({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    const hits = await detector.detect(bitmap);
    bitmap.close();
    const digits = hits[0]?.rawValue.replace(/\D/g, '') ?? '';
    if (digits.length >= 8 && digits.length <= 14) {
      return digits;
    }
    return null;
  } catch {
    return null;
  }
}
