import { Module } from '@nestjs/common';
import { OrgCountersModule } from '../org-counters/org-counters.module';
import { EntregaController } from './entrega.controller';
import { EntregaService } from './entrega.service';

@Module({
  imports: [OrgCountersModule],
  controllers: [EntregaController],
  providers: [EntregaService],
})
export class EntregaModule {}
