import assert from 'node:assert/strict';
import { test } from 'node:test';
import { interpretarTsv } from './tesseract.js';

const CABECERA =
  'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext';

const fila = (conf: string, texto: string) => `5\t1\t1\t1\t1\t1\t0\t0\t10\t10\t${conf}\t${texto}`;

test('promedia la confianza de las palabras reconocidas', () => {
  const tsv = [CABECERA, fila('90', 'COLGATE'), fila('70', 'TRIPLE')].join('\n');
  const resultado = interpretarTsv(tsv);
  assert.equal(resultado.texto, 'COLGATE TRIPLE');
  assert.equal(resultado.confianza, 0.8);
});

test('descarta las filas de bloque, que vienen con conf -1 y sin texto', () => {
  const tsv = [CABECERA, fila('-1', ''), fila('80', 'ARROZ')].join('\n');
  const resultado = interpretarTsv(tsv);
  assert.equal(resultado.texto, 'ARROZ');
  assert.equal(resultado.confianza, 0.8);
});

test('una imagen sin texto legible da confianza cero', () => {
  const tsv = [CABECERA, fila('-1', '')].join('\n');
  assert.deepEqual(interpretarTsv(tsv), { texto: '', confianza: 0 });
});

test('tolera un TSV vacío', () => {
  assert.deepEqual(interpretarTsv(''), { texto: '', confianza: 0 });
});
