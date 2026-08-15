import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
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
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
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
      });
  });
});
