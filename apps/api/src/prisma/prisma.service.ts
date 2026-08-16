import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Cliente de Prisma que no tumba la aplicación si la base no responde.
 *
 * Antes `onModuleInit` hacía `$connect()` y dejaba propagar el fallo. En
 * serverless eso significa que el arranque entero muere y **todas** las rutas
 * devuelven 500, incluidas las de salud: justo las que sirven para diagnosticar
 * por qué no arranca. Un `DATABASE_URL` mal puesto dejaba la función sin dar
 * ninguna pista.
 *
 * Ahora el fallo se registra y la app sigue en pie: `/api/health` responde,
 * `/api/health/ready` reporta la base caída, y las rutas que necesitan datos
 * fallan una a una con su error, en vez de desaparecer todas.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /** Último error de conexión, para que la ruta de salud lo pueda contar. */
  private errorDeConexion: string | null = null;

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.errorDeConexion = null;
      this.logger.log('Conexión a PostgreSQL establecida');
    } catch (error) {
      this.errorDeConexion = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `PostgreSQL no responde, la API arranca igual y lo reporta en /api/health/ready: ${this.errorDeConexion}`,
      );
    }
  }

  /** Null si la última conexión fue bien. */
  get fallaDeConexion(): string | null {
    return this.errorDeConexion;
  }

  /**
   * Reintenta la conexión. Prisma reconecta solo en cada consulta, pero esto
   * permite que la ruta de salud refleje la recuperación sin reiniciar nada.
   */
  async reintentarConexion(): Promise<boolean> {
    try {
      await this.$connect();
      this.errorDeConexion = null;
      return true;
    } catch (error) {
      this.errorDeConexion = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
