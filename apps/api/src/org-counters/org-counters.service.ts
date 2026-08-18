import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const CounterKind = {
  Recepcion: 'RECEPCION',
  Lote: 'LOTE',
} as const;

@Injectable()
export class OrgCountersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `db` deja pasar la transacción del llamador. Con una transacción corta y
   * acotada eso es lo correcto: el contador va en el mismo commit, no toma una
   * conexión extra del pool y no deja huecos si se revierte. Para las
   * transacciones largas —las que recorren pallets o líneas de kit— la salida
   * es la contraria y está en `siguienteBloque`: reservar antes de abrirla,
   * porque ahí el candado de la fila se retendría hasta el commit y
   * serializaría a todas las demás.
   */
  async siguiente(opts: {
    organizationId: string | null;
    kind: string;
    periodo?: string;
    db?: Prisma.TransactionClient;
  }): Promise<number> {
    const periodo = opts.periodo ?? '';
    const db = opts.db ?? this.prisma;
    if (opts.organizationId) {
      const rows = await db.$queryRaw<Array<{ siguiente: number }>>(
        Prisma.sql`
          INSERT INTO org_counters (id, organization_id, kind, periodo, siguiente, updated_at)
          VALUES (gen_random_uuid(), ${opts.organizationId}::uuid, ${opts.kind}, ${periodo}, 1, NOW())
          ON CONFLICT (organization_id, kind, periodo) WHERE organization_id IS NOT NULL
          DO UPDATE SET siguiente = org_counters.siguiente + 1, updated_at = NOW()
          RETURNING siguiente
        `,
      );
      return rows[0]?.siguiente ?? 1;
    }

    const rows = await db.$queryRaw<Array<{ siguiente: number }>>(
      Prisma.sql`
        INSERT INTO org_counters (id, organization_id, kind, periodo, siguiente, updated_at)
        VALUES (gen_random_uuid(), NULL, ${opts.kind}, ${periodo}, 1, NOW())
        ON CONFLICT (kind, periodo) WHERE organization_id IS NULL
        DO UPDATE SET siguiente = org_counters.siguiente + 1, updated_at = NOW()
        RETURNING siguiente
      `,
    );
    return rows[0]?.siguiente ?? 1;
  }

  /**
   * Reserva `cantidad` números consecutivos en una sola consulta.
   *
   * Existe para poder sacar los contadores fuera de las transacciones largas.
   * Pedirlos de a uno dentro de un `$transaction` toma una segunda conexión del
   * pool mientras la transacción ya retiene la suya: con varios despachos a la
   * vez eso agota el pool y se traba. Reservando el bloque antes de abrir la
   * transacción hay un solo viaje a la base y ninguna conexión extra.
   *
   * El `UPDATE ... RETURNING` devuelve el último número del bloque, así que el
   * rango reservado es `[siguiente - cantidad + 1, siguiente]`. Si la
   * transacción termina revirtiendo, ese bloque queda sin usar: son
   * identificadores, no un libro contable, y saltarse números ya era el
   * comportamiento de los códigos que se piden antes de abrir la transacción.
   */
  async siguienteBloque(opts: {
    organizationId: string;
    kind: string;
    periodo?: string;
    cantidad: number;
  }): Promise<number[]> {
    const periodo = opts.periodo ?? '';
    const cantidad = Math.max(1, Math.trunc(opts.cantidad));
    const rows = await this.prisma.$queryRaw<Array<{ siguiente: number }>>(
      Prisma.sql`
        INSERT INTO org_counters (id, organization_id, kind, periodo, siguiente, updated_at)
        VALUES (gen_random_uuid(), ${opts.organizationId}::uuid, ${opts.kind}, ${periodo}, ${cantidad}, NOW())
        ON CONFLICT (organization_id, kind, periodo) WHERE organization_id IS NOT NULL
        DO UPDATE SET siguiente = org_counters.siguiente + ${cantidad}, updated_at = NOW()
        RETURNING siguiente
      `,
    );
    const ultimo = rows[0]?.siguiente ?? cantidad;
    const primero = ultimo - cantidad + 1;
    return Array.from({ length: cantidad }, (_, i) => primero + i);
  }

  async codigoRecepcion(organizationId: string, now = new Date()): Promise<string> {
    const year = String(now.getUTCFullYear());
    const n = await this.siguiente({
      organizationId,
      kind: CounterKind.Recepcion,
      periodo: year,
    });
    return `REC-${year}-${pad(n, 6)}`;
  }

  async codigoLote(organizationId: string, now = new Date()): Promise<string> {
    const year = String(now.getUTCFullYear());
    const n = await this.siguiente({
      organizationId,
      kind: CounterKind.Lote,
      periodo: year,
    });
    return `LOT-${year}-${pad(n, 6)}`;
  }

  async codigoUnidad(organizationId: string, prefix: string): Promise<string> {
    const n = await this.siguiente({
      organizationId,
      kind: `UL:${prefix}`,
      periodo: '',
    });
    return `${prefix}-${pad(n, 6)}`;
  }

  async codigoSku(prefix: string): Promise<string> {
    const n = await this.siguiente({
      organizationId: null,
      kind: `SKU:${prefix}`,
      periodo: '',
    });
    return `${prefix}-${pad(n, 4)}`;
  }

  async codigoPutaway(organizationId: string, now = new Date()): Promise<string> {
    const year = String(now.getUTCFullYear());
    const n = await this.siguiente({
      organizationId,
      kind: 'PUTAWAY',
      periodo: year,
    });
    return `PUT-${year}-${pad(n, 6)}`;
  }

  async codigoMovimiento(
    organizationId: string,
    now = new Date(),
    db?: Prisma.TransactionClient,
  ): Promise<string> {
    const year = String(now.getUTCFullYear());
    const n = await this.siguiente({
      organizationId,
      kind: 'MOVIMIENTO',
      periodo: year,
      db,
    });
    return `MOV-${year}-${pad(n, 6)}`;
  }

  async codigosMovimiento(
    organizationId: string,
    cantidad: number,
    now = new Date(),
  ): Promise<string[]> {
    const year = String(now.getUTCFullYear());
    const numeros = await this.siguienteBloque({
      organizationId,
      kind: 'MOVIMIENTO',
      periodo: year,
      cantidad,
    });
    return numeros.map((n) => `MOV-${year}-${pad(n, 6)}`);
  }

  async codigoKit(organizationId: string): Promise<string> {
    const n = await this.siguiente({
      organizationId,
      kind: 'KIT',
      periodo: '',
    });
    return `KIT-${pad(n, 4)}`;
  }

  async codigoDemanda(organizationId: string, now = new Date()): Promise<string> {
    const year = String(now.getUTCFullYear());
    const n = await this.siguiente({
      organizationId,
      kind: 'DEMANDA',
      periodo: year,
    });
    return `DEM-${year}-${pad(n, 6)}`;
  }

  async codigoReserva(organizationId: string, now = new Date()): Promise<string> {
    const year = String(now.getUTCFullYear());
    const n = await this.siguiente({
      organizationId,
      kind: 'RESERVA',
      periodo: year,
    });
    return `RES-${year}-${pad(n, 6)}`;
  }

  async codigoKitInstancia(organizationId: string, now = new Date()): Promise<string> {
    const year = String(now.getUTCFullYear());
    const n = await this.siguiente({
      organizationId,
      kind: 'KIT_INSTANCIA',
      periodo: year,
    });
    return `KIN-${year}-${pad(n, 6)}`;
  }

  async codigoControl(organizationId: string, now = new Date()): Promise<string> {
    const year = String(now.getUTCFullYear());
    const n = await this.siguiente({
      organizationId,
      kind: 'CONTROL',
      periodo: year,
    });
    return `CTL-${year}-${pad(n, 6)}`;
  }

  async codigoConsolidacion(organizationId: string, now = new Date()): Promise<string> {
    const year = String(now.getUTCFullYear());
    const n = await this.siguiente({
      organizationId,
      kind: 'CONSOLIDACION',
      periodo: year,
    });
    return `CNS-${year}-${pad(n, 6)}`;
  }

  async codigoPlanPalletizacion(organizationId: string, now = new Date()): Promise<string> {
    const year = String(now.getUTCFullYear());
    const n = await this.siguiente({
      organizationId,
      kind: 'PLAN_PALLETIZACION',
      periodo: year,
    });
    return `PLAN-PAL-${year}-${pad(n, 6)}`;
  }

  async codigoPalletDespacho(organizationId: string, now = new Date()): Promise<string> {
    const year = String(now.getUTCFullYear());
    const n = await this.siguiente({
      organizationId,
      kind: 'PAL_DESP',
      periodo: year,
    });
    return `PAL-DSP-${year}-${pad(n, 6)}`;
  }

  async codigosPalletDespacho(
    organizationId: string,
    cantidad: number,
    now = new Date(),
  ): Promise<string[]> {
    const year = String(now.getUTCFullYear());
    const numeros = await this.siguienteBloque({
      organizationId,
      kind: 'PAL_DESP',
      periodo: year,
      cantidad,
    });
    return numeros.map((n) => `PAL-DSP-${year}-${pad(n, 6)}`);
  }

  async codigoDespacho(organizationId: string, now = new Date()): Promise<string> {
    const year = String(now.getUTCFullYear());
    const n = await this.siguiente({
      organizationId,
      kind: 'DESPACHO',
      periodo: year,
    });
    return `DSP-${year}-${pad(n, 6)}`;
  }

  async codigoViaje(organizationId: string, now = new Date()): Promise<string> {
    const year = String(now.getUTCFullYear());
    const n = await this.siguiente({
      organizationId,
      kind: 'VIAJE',
      periodo: year,
    });
    return `VIA-${year}-${pad(n, 6)}`;
  }
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}
