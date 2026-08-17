import { Module } from '@nestjs/common';
import { OrgCountersService } from './org-counters.service';

@Module({
  providers: [OrgCountersService],
  exports: [OrgCountersService],
})
export class OrgCountersModule {}
