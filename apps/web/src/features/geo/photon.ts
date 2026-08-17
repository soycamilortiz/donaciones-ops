/** Photon (Komoot) — geocoding sobre OpenStreetMap, sin API key. */

const PHOTON_BASE = 'https://photon.komoot.io';

/** Bias hacia el Chocó para priorizar resultados locales. */
export const CHOCO_BIAS = { lat: 5.69, lng: -76.66 } as const;

export type GeoSuggestion = {
  id: string;
  label: string;
  direccion: string;
  departamento: string;
  municipio: string;
  lat: number;
  lng: number;
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    postcode?: string;
  };
};

type PhotonResponse = { features?: PhotonFeature[] };

function labelFrom(props: NonNullable<PhotonFeature['properties']>): string {
  const street = [props.housenumber, props.street].filter(Boolean).join(' ').trim();
  const parts = [
    props.name && props.name !== street ? props.name : null,
    street || null,
    props.district,
    props.city ?? props.county,
    props.state,
  ].filter(Boolean);
  return parts.join(', ') || props.country || 'Ubicación';
}

function direccionFrom(props: NonNullable<PhotonFeature['properties']>): string {
  const street = [props.housenumber, props.street].filter(Boolean).join(' ').trim();
  if (street) return street;
  if (props.name) return props.name;
  return labelFrom(props);
}

function municipioFrom(props: NonNullable<PhotonFeature['properties']>): string {
  return (props.city || props.name || props.county || props.district || '').trim();
}

function departamentoFrom(props: NonNullable<PhotonFeature['properties']>): string {
  return (props.state || '').trim();
}

function toSuggestion(feature: PhotonFeature, index: number): GeoSuggestion | null {
  const coords = feature.geometry?.coordinates;
  const props = feature.properties;
  if (!coords || coords.length < 2 || !props) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: `${props.osm_type ?? 'n'}-${props.osm_id ?? index}`,
    label: labelFrom(props),
    direccion: direccionFrom(props),
    departamento: departamentoFrom(props),
    municipio: municipioFrom(props),
    lat,
    lng,
  };
}

export async function buscarDirecciones(
  query: string,
  signal?: AbortSignal,
  bias?: { lat: number; lng: number },
): Promise<GeoSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url = new URL(`${PHOTON_BASE}/api/`);
  url.searchParams.set('q', q);
  // Photon only accepts: default | de | en | fr (not es).
  url.searchParams.set('lang', 'en');
  url.searchParams.set('limit', '8');
  url.searchParams.set('lat', String(bias?.lat ?? CHOCO_BIAS.lat));
  url.searchParams.set('lon', String(bias?.lng ?? CHOCO_BIAS.lng));

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Photon ${res.status}`);
  }
  const json = (await res.json()) as PhotonResponse;
  const rows = (json.features ?? [])
    .map((f, i) => toSuggestion(f, i))
    .filter((s): s is GeoSuggestion => s !== null);

  const inColombia = rows.filter((row) =>
    /colombia|choc[oó]|antioquia|valle|cundinamarca|bogot/i.test(
      `${row.departamento} ${row.municipio} ${row.label}`,
    ),
  );
  return inColombia.length > 0 ? inColombia : rows;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<GeoSuggestion | null> {
  const url = new URL(`${PHOTON_BASE}/reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('lang', 'en');
  url.searchParams.set('limit', '1');

  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const json = (await res.json()) as PhotonResponse;
  const first = json.features?.[0];
  return first ? toSuggestion(first, 0) : null;
}
