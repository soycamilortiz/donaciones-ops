import { normalizeR2Endpoint, publicObjectUrl } from './r2.util';

describe('normalizeR2Endpoint', () => {
  it('saca el nombre del bucket si lo pegaron al final del S3 API', () => {
    expect(normalizeR2Endpoint('https://abc.r2.cloudflarestorage.com/sos-choco', 'sos-choco')).toBe(
      'https://abc.r2.cloudflarestorage.com',
    );
  });

  it('deja el endpoint si ya viene sin bucket', () => {
    expect(normalizeR2Endpoint('https://abc.r2.cloudflarestorage.com/', 'sos-choco')).toBe(
      'https://abc.r2.cloudflarestorage.com',
    );
  });
});

describe('publicObjectUrl', () => {
  it('arma la URL pública sin dobles barras', () => {
    expect(publicObjectUrl('https://pub-x.r2.dev/', '/donaciones/a.jpg')).toBe(
      'https://pub-x.r2.dev/donaciones/a.jpg',
    );
  });
});
