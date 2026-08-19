import { Module } from '@nestjs/common';
import { OrgCountersModule } from '../org-counters/org-counters.module';
import { TransporteController } from './transporte.controller';
import { TransporteService } from './transporte.service';

@Module({
  imports: [OrgCountersModule],
  controllers: [TransporteController],
  providers: [TransporteService],
  exports: [TransporteService],
})
export class TransporteModule {}
