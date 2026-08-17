import { esUrlPublicaUsable, normalizeR2Endpoint, publicObjectUrl } from './r2.util';

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

describe('esUrlPublicaUsable', () => {
  it('rechaza el S3 API', () => {
    expect(esUrlPublicaUsable('https://abc.r2.cloudflarestorage.com/sos-choco')).toBe(false);
  });

  it('rechaza el placeholder interno r2:// (no es una URL de navegador)', () => {
    expect(esUrlPublicaUsable('r2://sos-choco/donaciones/a.jpg')).toBe(false);
  });

  it('acepta r2.dev y un custom domain', () => {
    expect(esUrlPublicaUsable('https://pub-x.r2.dev')).toBe(true);
    expect(esUrlPublicaUsable('https://media.ejemplo.org')).toBe(true);
  });
});

describe('publicObjectUrl', () => {
  it('arma la URL pública sin dobles barras', () => {
    expect(publicObjectUrl('https://pub-x.r2.dev/', '/donaciones/a.jpg')).toBe(
      'https://pub-x.r2.dev/donaciones/a.jpg',
    );
  });
});
