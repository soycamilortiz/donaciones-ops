import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

/**
 * Arranque para entornos serverless (Vercel).
 *
 * `main.ts` no sirve aquí: llama a `app.listen()`, que en una función sin
 * servidor nunca devuelve el control y termina en FUNCTION_INVOCATION_FAILED.
 * Aquí se construye la app sobre un Express propio y se devuelve ese handler.
 *
 * La instancia se cachea entre invocaciones porque el contenedor se reutiliza:
 * reconstruir Nest en cada petición costaría cientos de milisegundos y abriría
 * una conexión nueva a Postgres cada vez.
 */
let cacheApp: Promise<Express> | null = null;

async function crearApp(): Promise<Express> {
  const server = express();

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    // En serverless los logs van a stdout de la función; el buffer solo
    // esconde los errores de arranque, que es justo lo que hay que ver.
    bufferLogs: false,
  });
  configureApp(app);

  // init() y no listen(): el que escucha es el runtime de Vercel.
  await app.init();

  return server;
}

export function obtenerApp(): Promise<Express> {
  // La promesa se cachea, no el resultado: si dos peticiones llegan durante el
  // arranque en frío, ambas esperan el mismo arranque en vez de crear dos apps.
  cacheApp ??= crearApp().catch((error: unknown) => {
    // Si falla, se limpia el cache para que el próximo intento reintente en vez
    // de quedar servido con una promesa rechazada para siempre.
    cacheApp = null;
    throw error;
  });
  return cacheApp;
}
