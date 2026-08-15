// Punto de entrada de la funcion serverless en Vercel.
//
// Es JavaScript y no TypeScript a proposito: Vercel compila los entrypoints con
// esbuild, que NO emite metadata de decoradores, y sin ella la inyeccion de
// dependencias de NestJS falla en tiempo de ejecucion. Por eso este archivo solo
// delega en el `dist` que ya compilo `tsc` con `emitDecoratorMetadata`.
//
// La logica vive en src/serverless.ts.
const { obtenerApp } = require('../dist/serverless.js');

module.exports = async function handler(req, res) {
  const app = await obtenerApp();
  app(req, res);
};
