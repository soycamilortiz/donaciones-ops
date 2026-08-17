import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createVisionClient } from './create-client.js';
import { parseLecturaProducto } from './parse.js';

describe('parseLecturaProducto', () => {
  it('normaliza nombre, marca y ean', () => {
    const r = parseLecturaProducto(
      JSON.stringify({
        nombre: ' Agua Brisa ',
        marca: 'Brisa',
        cantidad: 6,
        ean: '770-2006-400011',
      }),
    );
    assert.equal(r?.nombre, 'Agua Brisa');
    assert.equal(r?.marca, 'Brisa');
    assert.equal(r?.cantidad, 6);
    assert.equal(r?.ean, '7702006400011');
  });

  it('devuelve null si no es JSON', () => {
    assert.equal(parseLecturaProducto('no-json'), null);
  });
});

describe('createVisionClient', () => {
  it('cae a noop sin apiKey', async () => {
    const client = createVisionClient({});
    assert.equal(client.id, 'noop');
    const r = await client.leerProducto({
      bytes: new Uint8Array([1]),
      contentType: 'image/jpeg',
    });
    assert.equal(r, null);
  });

  it('respeta un adapter inyectado', async () => {
    const client = createVisionClient({
      adapter: {
        id: 'custom',
        async leerProducto() {
          return { nombre: 'Arroz', marca: null, cantidad: 1, ean: null };
        },
      },
    });
    assert.equal(client.id, 'custom');
    const r = await client.leerProducto({
      bytes: new Uint8Array([1]),
      contentType: 'image/jpeg',
    });
    assert.equal(r?.nombre, 'Arroz');
  });
});
