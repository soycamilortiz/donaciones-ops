import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Env } from './config/env.schema';

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<Env, true>);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`, `'unsafe-inline'`],
        },
      },
    }),
  );

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const corsOrigin = config.get('CORS_ORIGIN', { infer: true });
  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SOS Chocó API')
    .setDescription(
      [
        'API de logística humanitaria: donaciones, centros de acopio y envíos a zonas remotas.',
        '',
        'Prefijo global `/api`. Health no lleva versión (`/api/health`). El resto de módulos usará `/api/v1/...`.',
        '',
        'Hoy solo hay sistema y health. Los recursos de negocio se documentan en el mismo Swagger al agregarse.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addTag('sistema', 'Identidad del servicio')
    .addTag('health', 'Liveness y readiness (PostgreSQL)')
    .addServer('/', 'Mismo origen (Traefik)')
    .addServer('http://localhost:3000', 'Nest en el host')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'docs/openapi.json',
    yamlDocumentUrl: 'docs/openapi.yaml',
    customSiteTitle: 'SOS Chocó API',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      tryItOutEnabled: true,
    },
  });
}
