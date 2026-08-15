/** Datos mock del módulo donaciones. Reemplazar por llamadas a `apiRequest` cuando exista el endpoint. */

export interface Donacion extends Record<string, unknown> {
  id: string;
  donante: string;
  tipo: 'Alimentos' | 'Agua' | 'Ropa' | 'Medicinas' | 'Aseo';
  cantidad: string;
  centro: string;
  estado: 'recibida' | 'en_transito' | 'entregada';
  fecha: string;
}

export interface DonacionesStats {
  total: string;
  recibidas: string;
  enTransito: string;
  centros: string;
}

const DONACIONES: Donacion[] = [
  {
    id: 'don_1042',
    donante: 'Fundación Río',
    tipo: 'Alimentos',
    cantidad: '120 kits',
    centro: 'Acopio Quibdó',
    estado: 'recibida',
    fecha: '2026-08-15',
  },
  {
    id: 'don_1041',
    donante: 'María González',
    tipo: 'Agua',
    cantidad: '500 L',
    centro: 'Acopio Istmina',
    estado: 'en_transito',
    fecha: '2026-08-15',
  },
  {
    id: 'don_1040',
    donante: 'Colegio San José',
    tipo: 'Ropa',
    cantidad: '30 cajas',
    centro: 'Acopio Quibdó',
    estado: 'entregada',
    fecha: '2026-08-14',
  },
  {
    id: 'don_1039',
    donante: 'Droguería Central',
    tipo: 'Medicinas',
    cantidad: '18 cajas',
    centro: 'Acopio Condoto',
    estado: 'recibida',
    fecha: '2026-08-14',
  },
  {
    id: 'don_1038',
    donante: 'Anónimo',
    tipo: 'Aseo',
    cantidad: '60 kits',
    centro: 'Acopio Istmina',
    estado: 'entregada',
    fecha: '2026-08-13',
  },
];

export function getDonaciones(): Donacion[] {
  return DONACIONES;
}

export function getDonacionesStats(): DonacionesStats {
  return { total: '1.284', recibidas: '842', enTransito: '196', centros: '7' };
}
