import { crearPanel } from './app.js';
import { loadConfig } from './config.js';

/**
 * Arranque para un proceso de larga vida (Docker). En serverless el entry es
 * `api/index.js`, que usa `crearPanel()` sin escuchar en ningún puerto.
 */
const config = loadConfig();
const panel = crearPanel(config);

const servidor = panel.app.listen(config.PORT, () => {
  console.log(
    JSON.stringify({
      mensaje: 'panel de jobs arriba',
      puerto: config.PORT,
      ruta: config.JOBS_BASE_PATH,
      colas: panel.colas,
    }),
  );
});

async function apagar(senal: string): Promise<void> {
  console.log(JSON.stringify({ mensaje: 'apagando', senal }));
  servidor.close();
  await panel.cerrar();
  process.exit(0);
}

process.on('SIGTERM', () => void apagar('SIGTERM'));
process.on('SIGINT', () => void apagar('SIGINT'));
