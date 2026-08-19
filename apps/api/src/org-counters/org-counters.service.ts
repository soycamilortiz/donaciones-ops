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

  async siguiente(opts: {
    organizationId: string | null;
    kind: string;
    periodo?: string;
  }): Promise<number> {
    const periodo = opts.periodo ?? '';
    if (opts.organizationId) {
      const rows = await this.prisma.$queryRaw<Array<{ siguiente: number }>>(
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

    const rows = await this.prisma.$queryRaw<Array<{ siguiente: number }>>(
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

  async codigoMovimiento(organizationId: string, now = new Date()): Promise<string> {
    const year = String(now.getUTCFullYear());
    const n = await this.siguiente({
      organizationId,
      kind: 'MOVIMIENTO',
      periodo: year,
    });
    return `MOV-${year}-${pad(n, 6)}`;
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
    return `TRP-${year}-${pad(n, 6)}`;
  }

  async codigoRuta(organizationId: string, now = new Date()): Promise<string> {
    const year = String(now.getUTCFullYear());
    const n = await this.siguiente({
      organizationId,
      kind: 'RUTA',
      periodo: year,
    });
    return `RUT-${year}-${pad(n, 4)}`;
  }
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}
