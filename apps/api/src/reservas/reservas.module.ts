import { Module } from '@nestjs/common';
import { OrgCountersModule } from '../org-counters/org-counters.module';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';

@Module({
  imports: [OrgCountersModule],
  controllers: [ReservasController],
  providers: [ReservasService],
  exports: [ReservasService],
})
export class ReservasModule {}
