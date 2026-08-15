import { Module } from '@nestjs/common';
import { AcopiosController } from './acopios.controller';
import { AcopiosService } from './acopios.service';

@Module({
  controllers: [AcopiosController],
  providers: [AcopiosService],
})
export class AcopiosModule {}
