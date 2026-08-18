import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Producto } from '@soschoco/shared';
import { distanciaAcotada, emparejar, normalizar, puntuarTermino, tokenizar } from './emparejar.js';

const producto = (id: string, nombre: string, alias: string[] = [], marca?: string): Producto => ({
  id,
  sku: `SKU-${id}`,
  nombre,
  marca: marca ?? null,
  categoria: null,
  ean: null,
  alias,
});

const CATALOGO: Producto[] = [
  producto('1', 'Crema dental Colgate', ['colgate', 'colgate triple accion'], 'Colgate'),
  producto('2', 'Arroz Diana', ['arroz diana'], 'Diana'),
  producto('3', 'Agua Cristal', ['agua cristal', 'botella agua'], 'Cristal'),
];

test('normalizar quita tildes, puntuación y mayúsculas', () => {
  assert.equal(normalizar('CREMA DENTAL, ACCIÓN!'), 'crema dental accion');
});

test('tokenizar descarta palabras de menos de tres letras', () => {
  assert.deepEqual(tokenizar('el arroz de la diana'), ['arroz', 'diana']);
});

test('distanciaAcotada corta apenas supera el máximo', () => {
  assert.equal(distanciaAcotada('colgate', 'colgate', 1), 0);
  assert.equal(distanciaAcotada('colgate', 'colgat', 1), 1);
  assert.ok(distanciaAcotada('colgate', 'arroz', 1) > 1);
});

test('puntuarTermino exige todas las palabras del término', () => {
  const tokens = tokenizar('bolsa de arroz diana 500g');
  assert.equal(puntuarTermino(tokens, 'arroz diana'), 1);
  assert.equal(puntuarTermino(tokens, 'arroz roa'), 0.5);
});

test('empareja pese a una errata del OCR', () => {
  // "colgat" es lo que suele salir del envase curvo
  const hallazgo = emparejar('CREMA DENTAL COLGAT TRIPLE', CATALOGO, 0.75);
  assert.equal(hallazgo?.producto.id, '1');
});

test('empareja un producto de dos palabras', () => {
  const hallazgo = emparejar('ARROZ DIANA 500 G', CATALOGO, 0.75);
  assert.equal(hallazgo?.producto.id, '2');
});

test('devuelve null cuando el texto no se parece a nada del catálogo', () => {
  assert.equal(emparejar('XKCD 9999 ????', CATALOGO, 0.75), null);
});

test('devuelve null con texto vacío', () => {
  assert.equal(emparejar('', CATALOGO, 0.75), null);
});

test('ante marca y generico que empatan, gana el mas especifico', () => {
  // Caso real: el catalogo tiene "Arroz" y "Arroz Diana", y el OCR lee
  // "ARROZ DIANA 500 G". Ambos puntuan 1; quedarse con el generico perderia la
  // marca, y negarse a elegir mandaria a revision algo bien reconocido.
  const catalogo: Producto[] = [
    producto('generico', 'Arroz', ['arroz', 'arroz blanco']),
    producto('marca', 'Arroz Diana', ['arroz diana', 'diana'], 'Diana'),
    producto('otra', 'Arroz Roa', ['arroz roa', 'roa'], 'Roa'),
  ];
  assert.equal(emparejar('ARROZ DIANA 500 G', catalogo, 0.75)?.producto.id, 'marca');
});

test('si solo aparece el generico, no inventa una marca', () => {
  const catalogo: Producto[] = [
    producto('generico', 'Arroz', ['arroz', 'arroz blanco']),
    producto('marca', 'Arroz Diana', ['arroz diana', 'diana'], 'Diana'),
  ];
  assert.equal(emparejar('BULTO DE ARROZ', catalogo, 0.75)?.producto.id, 'generico');
});

test('ante un empate prefiere no elegir', () => {
  const ambiguo: Producto[] = [
    producto('a', 'Jabón azul', ['jabon']),
    producto('b', 'Jabón blanco', ['jabon']),
  ];
  assert.equal(emparejar('JABON', ambiguo, 0.75), null);
});
