import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { R2StorageService } from '../../storage/r2.service';

@Injectable()
export class R2HealthIndicator {
  constructor(
    private readonly r2: R2StorageService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    if (!this.r2.isConfigured()) {
      return indicator.down({
        message: `Faltan ${this.r2.missingConfig().join(', ')}`,
        bucket: this.r2.bucket,
      });
    }

    try {
      const { bucket } = await this.r2.ping();
      return indicator.up({ bucket });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return indicator.down({ message, bucket: this.r2.bucket });
    }
  }
}
