import {
  categoriaCompatible,
  destinoAdmiteReubicacion,
  origenAdmiteReubicacion,
} from '@soschoco/shared';

export { categoriaCompatible, destinoAdmiteReubicacion, origenAdmiteReubicacion };

const ALIMENTOS: ReadonlySet<string> = new Set([
  'ALIMENTOS_NO_PERECEDEROS',
  'AGUA',
  'ALIMENTO_MASCOTAS',
]);

const MEDICAMENTOS: ReadonlySet<string> = new Set(['MEDICAMENTOS', 'MEDICAMENTO_MASCOTAS']);

export const FUNCIONES_PUTAWAY = ['ALMACENAMIENTO', 'PICKING'] as const;

export const MUELLE_CODIGO = 'MUELLE';

export function motivoIncompatible(
  categoria: string,
  ubicacion: {
    permiteAlimentos: boolean;
    permiteMedicamentos: boolean;
    permiteRopa: boolean;
  },
): string | null {
  if (categoriaCompatible(categoria, ubicacion)) {
    return null;
  }
  if (ALIMENTOS.has(categoria)) {
    return 'Esta ubicación no admite alimentos';
  }
  if (MEDICAMENTOS.has(categoria)) {
    return 'Esta ubicación no admite medicamentos';
  }
  return 'Esta ubicación no admite este tipo de ayuda';
}

/** `null` = sin tope de unidades. */
export function disponibleUnidades(
  capacidadUnidades: number | null | undefined,
  ocupacion: number,
): number | null {
  if (capacidadUnidades == null) {
    return null;
  }
  return Math.max(0, capacidadUnidades - ocupacion);
}

export function planificarPutaway(
  cantidad: number,
  candidatos: Array<{ id: string; disponible: number | null }>,
): { lineas: Array<{ ubicacionId: string; cantidad: number }>; resto: number } {
  const lineas: Array<{ ubicacionId: string; cantidad: number }> = [];
  let resto = cantidad;
  for (const candidato of candidatos) {
    if (resto <= 0) {
      break;
    }
    const cupo = candidato.disponible == null ? resto : Math.min(resto, candidato.disponible);
    if (cupo <= 0) {
      continue;
    }
    lineas.push({ ubicacionId: candidato.id, cantidad: cupo });
    resto -= cupo;
  }
  return { lineas, resto };
}
