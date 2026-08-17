import { Module } from '@nestjs/common';
import { UbicacionesModule } from '../ubicaciones/ubicaciones.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [UbicacionesModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
