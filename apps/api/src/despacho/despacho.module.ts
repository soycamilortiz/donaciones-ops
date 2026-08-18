import { Module } from '@nestjs/common';
import { OrgCountersModule } from '../org-counters/org-counters.module';
import { DespachoController } from './despacho.controller';
import { DespachoService } from './despacho.service';

@Module({
  imports: [OrgCountersModule],
  controllers: [DespachoController],
  providers: [DespachoService],
  exports: [DespachoService],
})
export class DespachoModule {}
