import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AcopiosModule } from './acopios/acopios.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';
import { RbacModule } from './rbac/rbac.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    RbacModule,
    OrganizationsModule,
    AcopiosModule,
    InventoryModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
