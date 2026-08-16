import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsearEtiqueta } from './etiqueta.js';

test('lee pack x6 y deja el nombre', () => {
  const r = parsearEtiqueta('BOTELLAS DE AGUA X6 MARCA BRISA');
  assert.equal(r.cantidad, 6);
  assert.match(r.nombre.toLowerCase(), /agua|botellas|brisa/);
});

test('sin cantidad asume 1', () => {
  const r = parsearEtiqueta('ARROZ DIANA 500G');
  assert.equal(r.cantidad, 1);
  assert.match(r.nombre.toLowerCase(), /arroz/);
});
