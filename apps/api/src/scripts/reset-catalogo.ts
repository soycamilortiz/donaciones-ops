import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Vacía el catálogo global `productos` y datos que dependen de él (kits, demandas, reservas).
 * Desvincula inventario, recepciones e imágenes. El stock físico se conserva sin productoId.
 *
 *   pnpm --filter api db:reset-catalogo
 *
 * Solo para entornos de desarrollo/staging. No corre en producción salvo confirmación explícita.
 */
async function main(): Promise<void> {
  const logger = new Logger('ResetCatalogo');
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_RESET_CATALOGO !== 'true') {
    logger.error(
      'Refusing to reset catalog in production. Set FORCE_RESET_CATALOGO=true to override.',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: false });
  const prisma = app.get(PrismaService);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.consolidacionKit.deleteMany({});
      await tx.consolidacion.deleteMany({});
      await tx.controlInspeccion.deleteMany({});
      await tx.controlLote.deleteMany({});
      await tx.kitInstanciaItem.deleteMany({});
      await tx.kitInstancia.deleteMany({});
      await tx.reservaAsignacion.deleteMany({});
      await tx.reservaItem.deleteMany({});
      await tx.reserva.deleteMany({});
      await tx.demandaItem.deleteMany({});
      await tx.demanda.deleteMany({});
      await tx.kitComponente.deleteMany({});
      await tx.kit.deleteMany({});
      await tx.inventoryItem.updateMany({ data: { productoId: null } });
      await tx.recepcionItem.updateMany({ data: { productoId: null } });
      await tx.donacionImagen.updateMany({ data: { productoId: null } });
      await tx.lote.deleteMany({});
      await tx.producto.deleteMany({});
      await tx.orgCounter.deleteMany({ where: { kind: { startsWith: 'SKU:' } } });
    });
    logger.log('Catálogo productos vacío. Nuevos productos nacen al confirmar recepciones.');
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
