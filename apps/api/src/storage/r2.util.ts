/** Si pegaron el S3 API con `/bucket` al final, lo sacamos. */
export function normalizeR2Endpoint(endpoint: string, bucket: string): string {
  const trimmed = endpoint.replace(/\/+$/, '');
  const suffix = `/${bucket}`;
  if (trimmed.endsWith(suffix)) {
    return trimmed.slice(0, -suffix.length);
  }
  return trimmed;
}

export function publicObjectUrl(publicBaseUrl: string, key: string): string {
  const base = publicBaseUrl.replace(/\/+$/, '');
  const path = key.replace(/^\/+/, '');
  return `${base}/${path}`;
}

/** El S3 API exige firma; un GET anónimo da 400. No sirve para <img> ni para el worker. */
export function esUrlPublicaUsable(url: string | undefined | null): url is string {
  if (!url) return false;
  return !url.includes('r2.cloudflarestorage.com');
}
