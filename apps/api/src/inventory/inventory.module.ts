import { Module } from '@nestjs/common';
import { UbicacionesModule } from '../ubicaciones/ubicaciones.module';
import { ReservasModule } from '../reservas/reservas.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [UbicacionesModule, ReservasModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
