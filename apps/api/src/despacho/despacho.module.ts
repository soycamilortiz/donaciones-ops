import { Module } from '@nestjs/common';
import { OrgCountersModule } from '../org-counters/org-counters.module';
import { TransporteModule } from '../transporte/transporte.module';
import { DespachoController } from './despacho.controller';
import { DespachoService } from './despacho.service';

@Module({
  imports: [OrgCountersModule, TransporteModule],
  controllers: [DespachoController],
  providers: [DespachoService],
  exports: [DespachoService],
})
export class DespachoModule {}
