import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AcopiosModule } from './acopios/acopios.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.schema';
import { ConsolidacionModule } from './consolidacion/consolidacion.module';
import { DespachoModule } from './despacho/despacho.module';
import { DonacionesModule } from './donaciones/donaciones.module';
import { EntregaModule } from './entrega/entrega.module';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';
import { RbacModule } from './rbac/rbac.module';
import { RecepcionesModule } from './recepciones/recepciones.module';
import { ReservasModule } from './reservas/reservas.module';
import { StorageModule } from './storage/storage.module';
import { TransporteModule } from './transporte/transporte.module';
import { UbicacionesModule } from './ubicaciones/ubicaciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    StorageModule,
    HealthModule,
    AuthModule,
    RbacModule,
    OrganizationsModule,
    AcopiosModule,
    InventoryModule,
    UbicacionesModule,
    DonacionesModule,
    RecepcionesModule,
    ReservasModule,
    ConsolidacionModule,
    DespachoModule,
    TransporteModule,
    EntregaModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
