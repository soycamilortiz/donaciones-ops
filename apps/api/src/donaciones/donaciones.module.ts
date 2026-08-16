import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ColaService } from './cola.service';
import { DonacionesController } from './donaciones.controller';
import { DonacionesService } from './donaciones.service';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [DonacionesController],
  providers: [DonacionesService, ColaService],
  exports: [DonacionesService],
})
export class DonacionesModule {}
