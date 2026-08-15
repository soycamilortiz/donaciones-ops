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
        'Prefijo global `/api`. Health no lleva versión (`/api/health`). El dominio usa `/api/v1/...`.',
        '',
        'Autenticación propia: JWT Bearer. Registro y login requieren captcha. Las contraseñas se guardan con bcrypt (12 rounds), nunca en texto plano.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'jwt',
    )
    .addTag('sistema', 'Identidad del servicio')
    .addTag('health', 'Liveness y readiness (PostgreSQL)')
    .addTag('auth', 'Registro, login y captcha')
    .addTag('me', 'Usuario autenticado y membresías')
    .addTag('organizations', 'Organizaciones y miembros')
    .addTag('acopios', 'Centros de acopio (bodegas)')
    .addTag('roles', 'Catálogo de roles y permisos')
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
