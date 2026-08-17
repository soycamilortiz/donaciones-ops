import raw from './colombia.min.json';

export type DepartamentoColombia = {
  id: number;
  departamento: string;
  ciudades: string[];
};

const DEPARTAMENTOS = raw as DepartamentoColombia[];

/** Fold accents for fuzzy matching Photon → DIVIPOLA names. */
export function foldEs(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function listDepartamentos(): string[] {
  return DEPARTAMENTOS.map((row) => row.departamento).sort((a, b) => a.localeCompare(b, 'es'));
}

export function listMunicipios(departamento: string): string[] {
  const hit = DEPARTAMENTOS.find((row) => foldEs(row.departamento) === foldEs(departamento));
  return hit ? [...hit.ciudades].sort((a, b) => a.localeCompare(b, 'es')) : [];
}

export function matchDepartamento(hint: string | null | undefined): string {
  const key = foldEs(hint ?? '');
  if (!key) return '';
  const hit = DEPARTAMENTOS.find((row) => foldEs(row.departamento) === key);
  if (hit) return hit.departamento;
  const partial = DEPARTAMENTOS.find(
    (row) => foldEs(row.departamento).includes(key) || key.includes(foldEs(row.departamento)),
  );
  return partial?.departamento ?? '';
}

export function matchMunicipio(departamento: string, hint: string | null | undefined): string {
  const key = foldEs(hint ?? '');
  if (!key) return '';
  const municipios = listMunicipios(departamento);
  const exact = municipios.find((name) => foldEs(name) === key);
  if (exact) return exact;
  const partial = municipios.find(
    (name) => foldEs(name).includes(key) || key.includes(foldEs(name)),
  );
  return partial ?? '';
}

/** Default bias for Chocó when the form starts empty. */
export const DEFAULT_DEPARTAMENTO = 'Chocó';
