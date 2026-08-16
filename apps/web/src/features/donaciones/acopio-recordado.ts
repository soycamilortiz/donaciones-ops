const CLAVE_ACOPIO = 'soschoco.ultimoAcopio';

export function leerAcopioRecordado(orgId: string): string {
  return localStorage.getItem(`${CLAVE_ACOPIO}.${orgId}`) ?? '';
}

export function recordarAcopio(orgId: string, acopioId: string): void {
  if (acopioId) {
    localStorage.setItem(`${CLAVE_ACOPIO}.${orgId}`, acopioId);
  } else {
    localStorage.removeItem(`${CLAVE_ACOPIO}.${orgId}`);
  }
}
