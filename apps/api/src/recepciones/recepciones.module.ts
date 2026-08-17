import { Module } from '@nestjs/common';
import { CatalogoModule } from '../catalogo/catalogo.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrgCountersModule } from '../org-counters/org-counters.module';
import { RecepcionesController } from './recepciones.controller';
import { RecepcionesService } from './recepciones.service';

@Module({
  imports: [CatalogoModule, InventoryModule, OrgCountersModule],
  controllers: [RecepcionesController],
  providers: [RecepcionesService],
  exports: [RecepcionesService],
})
export class RecepcionesModule {}
