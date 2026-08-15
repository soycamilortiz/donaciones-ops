import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma.health-indicator';

describe('HealthController', () => {
  let controller: HealthController;
  let health: { check: jest.Mock };
  let prismaHealth: { isHealthy: jest.Mock };

  beforeEach(async () => {
    health = { check: jest.fn() };
    prismaHealth = { isHealthy: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: health },
        { provide: PrismaHealthIndicator, useValue: prismaHealth },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('liveness reporta que el proceso está en pie', () => {
    expect(controller.liveness()).toEqual({ status: 'ok' });
  });

  it('readiness delega el chequeo de PostgreSQL', async () => {
    const payload = { status: 'ok', details: { database: { status: 'up' } } };
    health.check.mockResolvedValue(payload);
    prismaHealth.isHealthy.mockResolvedValue({ database: { status: 'up' } });

    await expect(controller.readiness()).resolves.toEqual(payload);
    expect(health.check).toHaveBeenCalledTimes(1);
  });
});
