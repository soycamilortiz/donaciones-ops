import { Module } from '@nestjs/common';
import { CatalogoModule } from '../catalogo/catalogo.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RecepcionesModule } from '../recepciones/recepciones.module';
import { ColaService } from './cola.service';
import { DonacionesController } from './donaciones.controller';
import { DonacionesService } from './donaciones.service';
import { OpenFoodFactsService } from './open-food-facts.service';
import { VisionProductoService } from './vision-producto.service';

@Module({
  imports: [PrismaModule, InventoryModule, CatalogoModule, RecepcionesModule],
  controllers: [DonacionesController],
  providers: [DonacionesService, ColaService, OpenFoodFactsService, VisionProductoService],
  exports: [DonacionesService],
})
export class DonacionesModule {}
