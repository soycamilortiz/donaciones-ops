import { HealthCheckService } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma.health-indicator';
import { R2HealthIndicator } from './indicators/r2.health-indicator';

describe('HealthController', () => {
  let controller: HealthController;
  let health: { check: jest.Mock };
  let prismaHealth: { isHealthy: jest.Mock };
  let r2Health: { isHealthy: jest.Mock };

  beforeEach(async () => {
    health = { check: jest.fn() };
    prismaHealth = { isHealthy: jest.fn() };
    r2Health = { isHealthy: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: health },
        { provide: PrismaHealthIndicator, useValue: prismaHealth },
        { provide: R2HealthIndicator, useValue: r2Health },
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

  it('storage delega el chequeo de R2', async () => {
    const payload = { status: 'ok', details: { r2: { status: 'up', bucket: 'sos-choco' } } };
    health.check.mockResolvedValue(payload);
    r2Health.isHealthy.mockResolvedValue({ r2: { status: 'up' } });

    await expect(controller.storage()).resolves.toEqual(payload);
    expect(health.check).toHaveBeenCalledTimes(1);
  });
});
