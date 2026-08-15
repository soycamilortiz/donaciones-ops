import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ColaService } from './cola.service';
import { DonacionesController } from './donaciones.controller';
import { DonacionesService } from './donaciones.service';

@Module({
  imports: [PrismaModule],
  controllers: [DonacionesController],
  providers: [DonacionesService, ColaService],
  exports: [DonacionesService],
})
export class DonacionesModule {}
