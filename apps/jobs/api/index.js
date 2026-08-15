// Punto de entrada de la funcion serverless en Vercel.
//
// Igual que en el API: delega en el dist compilado por tsc. Aqui no hay
// decoradores en juego, pero se mantiene el mismo patron para que ambas apps
// se desplieguen y se depuren igual.
const { crearPanel } = require('../dist/app.js');
const { loadConfig } = require('../dist/config.js');

// Se cachea entre invocaciones: reconstruir el panel abriria una conexion
// nueva a Redis en cada peticion.
let panel = null;

module.exports = function handler(req, res) {
  panel ??= crearPanel(loadConfig());
  panel.app(req, res);
};
