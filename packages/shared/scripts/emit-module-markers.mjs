// tsc no escribe el campo "type" en la salida, y Node lo necesita para saber
// si dist/cjs es CommonJS y dist/esm es ESM. Se ejecuta al final del build.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(dirname(fileURLToPath(import.meta.url))), 'dist');

writeFileSync(join(dist, 'cjs', 'package.json'), `${JSON.stringify({ type: 'commonjs' })}\n`);
writeFileSync(join(dist, 'esm', 'package.json'), `${JSON.stringify({ type: 'module' })}\n`);
