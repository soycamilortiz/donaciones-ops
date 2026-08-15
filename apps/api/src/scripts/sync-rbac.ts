import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RbacService } from '../rbac/rbac.service';

/**
 * Sincroniza el catálogo de roles y permisos contra la base.
 *
 * En Docker esto corre solo al arrancar el API. En serverless no puede: el
 * arranque en frío ocurre muchas veces al día y son ~20 escrituras cada vez.
 * Allá se pone `RBAC_SYNC_ON_BOOT=false` y se ejecuta este script una vez tras
 * cada despliegue:
 *
 *   pnpm --filter api rbac:sync
 */
async function main(): Promise<void> {
  const logger = new Logger('SyncRbac');

  // Contexto sin servidor HTTP: solo se necesita el contenedor de dependencias.
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: false });

  try {
    await app.get(RbacService).ensureCatalog();
    logger.log('Catálogo de roles y permisos sincronizado');
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
