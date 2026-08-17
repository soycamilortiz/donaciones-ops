import { Module } from '@nestjs/common';
import { OrgCountersModule } from '../org-counters/org-counters.module';
import { CatalogoService } from './catalogo.service';

@Module({
  imports: [OrgCountersModule],
  providers: [CatalogoService],
  exports: [CatalogoService],
})
export class CatalogoModule {}
