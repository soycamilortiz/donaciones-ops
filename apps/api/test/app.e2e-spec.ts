import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { PrismaService } from './../src/prisma/prisma.service';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]),
        permission: {
          upsert: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
        role: {
          upsert: jest.fn().mockResolvedValue({ id: 'role' }),
          findMany: jest.fn().mockResolvedValue([]),
        },
        rolePermission: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
        captchaChallenge: {
          create: jest.fn(),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api expone metadatos', () => {
    return request(app.getHttpServer()).get('/api').expect(200).expect({
      name: 'soschoco-api',
      service: 'SOS Chocó',
      docs: '/api/docs',
    });
  });

  it('GET /api/health es liveness', () => {
    return request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 'ok' });
  });

  it('GET /api/docs/openapi.json expone OpenAPI 3', () => {
    return request(app.getHttpServer())
      .get('/api/docs/openapi.json')
      .expect(200)
      .expect((res) => {
        expect(res.body.openapi).toMatch(/^3\./);
        expect(res.body.info.title).toBe('SOS Chocó API');
        expect(res.body.paths['/api']).toBeDefined();
        expect(res.body.paths['/api/health']).toBeDefined();
        expect(res.body.paths['/api/health/ready']).toBeDefined();
        expect(res.body.paths['/api/v1/auth/login']).toBeDefined();
        expect(res.body.paths['/api/v1/auth/register']).toBeDefined();
      });
  });

  it('GET /api/v1/auth/captcha es público', () => {
    return request(app.getHttpServer())
      .get('/api/v1/auth/captcha')
      .expect(200)
      .expect((res) => {
        expect(res.body.captchaId).toEqual(expect.any(String));
        expect(String(res.body.svg)).toContain('<svg');
      });
  });

  it('GET /api/v1/me exige JWT', () => {
    return request(app.getHttpServer()).get('/api/v1/me').expect(401);
  });
});
