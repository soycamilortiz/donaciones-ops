import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { StorageModule } from '../storage/storage.module';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma.health-indicator';
import { R2HealthIndicator } from './indicators/r2.health-indicator';

@Module({
  imports: [TerminusModule, StorageModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, R2HealthIndicator],
})
export class HealthModule {}
