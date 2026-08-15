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
