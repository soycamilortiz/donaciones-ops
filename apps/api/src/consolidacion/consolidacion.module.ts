import { Module } from '@nestjs/common';
import { OrgCountersModule } from '../org-counters/org-counters.module';
import { UbicacionesModule } from '../ubicaciones/ubicaciones.module';
import { ConsolidacionController } from './consolidacion.controller';
import { ConsolidacionService } from './consolidacion.service';

@Module({
  imports: [OrgCountersModule, UbicacionesModule],
  controllers: [ConsolidacionController],
  providers: [ConsolidacionService],
  exports: [ConsolidacionService],
})
export class ConsolidacionModule {}
