import { Injectable } from '@nestjs/common';
import { InventoryCategoria, InventoryUnidad, type Producto } from '@prisma/client';
import { similitudNombres, UMBRAL_MISMO_PRODUCTO } from '../inventory/nombre-producto';
import { OrgCountersService } from '../org-counters/org-counters.service';
import { PrismaService } from '../prisma/prisma.service';

const SKU_PREFIX: Record<InventoryCategoria, string> = {
  ALIMENTOS_NO_PERECEDEROS: 'ALI',
  AGUA: 'AGU',
  ASEO_HIGIENE: 'ASE',
  PANALES_BEBE: 'PAN',
  MEDICAMENTOS: 'MED',
  ROPA_CALZADO: 'ROP',
  COLCHONETAS_COBIJAS: 'COL',
  ALIMENTO_MASCOTAS: 'MAS',
  MEDICAMENTO_MASCOTAS: 'MME',
  LOGISTICA_RESCATE: 'LOG',
  MENAJE_COCINA: 'MEN',
  DESECHABLES: 'DES',
  OTRO: 'OTR',
};

export type AltaProducto = {
  nombre: string;
  marca?: string | null;
  ean?: string | null;
  categoria?: InventoryCategoria;
  presentacion?: string | null;
  unidadBase?: InventoryUnidad;
  alias?: string[];
};

@Injectable()
export class CatalogoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: OrgCountersService,
  ) {}

  async crear(entrada: AltaProducto): Promise<Producto> {
    const categoria = entrada.categoria ?? inferirCategoria(entrada.nombre);
    const reglas = reglasDe(categoria);
    const sku = await this.counters.codigoSku(SKU_PREFIX[categoria]);
    const alias = new Set((entrada.alias ?? []).map((a) => a.trim().toLowerCase()).filter(Boolean));
    const nombre = entrada.nombre.trim();
    const marca = entrada.marca?.trim() || null;
    if (nombre) {
      alias.add(nombre.toLowerCase());
    }
    if (marca) {
      alias.add(marca.toLowerCase());
    }

    return this.prisma.producto.create({
      data: {
        sku,
        nombre,
        marca,
        ean: entrada.ean?.trim() || null,
        categoria: etiquetaCategoria(categoria),
        categoriaInventario: categoria,
        unidadBase: entrada.unidadBase ?? InventoryUnidad.UNIDAD,
        presentacion: entrada.presentacion?.trim() || null,
        alias: [...alias],
        ...reglas,
        isActive: true,
      },
    });
  }

  async findOrCreateDesdeOff(externo: {
    ean: string;
    nombre: string;
    marca: string | null;
  }): Promise<Producto> {
    const existente = await this.prisma.producto.findFirst({
      where: { ean: externo.ean, isActive: true },
    });
    if (existente) {
      return existente;
    }
    try {
      return await this.crear({
        nombre: externo.nombre,
        marca: externo.marca,
        ean: externo.ean,
        categoria: inferirCategoria(externo.nombre),
      });
    } catch {
      const race = await this.prisma.producto.findFirst({
        where: { ean: externo.ean },
      });
      if (race) {
        return race;
      }
      throw new Error('No se pudo guardar el producto del catálogo externo');
    }
  }

  async coincidencias(
    nombre: string,
    marca?: string | null,
  ): Promise<
    Array<{ id: string; nombre: string; marca: string | null; cantidad: number; score: number }>
  > {
    const filas = await this.prisma.producto.findMany({
      where: { isActive: true },
      select: { id: true, nombre: true, marca: true },
    });
    return filas
      .map((row) => ({
        id: row.id,
        nombre: row.nombre,
        marca: row.marca,
        cantidad: 0,
        score: scoreFila(nombre, marca, row.nombre, row.marca),
      }))
      .filter((row) => row.score >= 0.55)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  async resolverPorNombre(nombre: string, marca?: string | null): Promise<Producto | null> {
    const hits = await this.coincidencias(nombre, marca);
    const best = hits[0];
    if (!best || best.score < UMBRAL_MISMO_PRODUCTO) {
      return null;
    }
    return this.prisma.producto.findUnique({ where: { id: best.id } });
  }
}

export function inferirCategoria(nombre: string): InventoryCategoria {
  const n = nombre.toLowerCase();
  if (/\bagua|brisa|cristal|botella/.test(n)) {
    return InventoryCategoria.AGUA;
  }
  if (/\barroz|atún|atun|aceite|lenteja|frijol|harina|azucar|azúcar|panela|atun/.test(n)) {
    return InventoryCategoria.ALIMENTOS_NO_PERECEDEROS;
  }
  if (/\bpañal|panal|bebe|bebé/.test(n)) {
    return InventoryCategoria.PANALES_BEBE;
  }
  if (/\bjabón|jabon|shampoo|higiene|crema|colgate|papel/.test(n)) {
    return InventoryCategoria.ASEO_HIGIENE;
  }
  if (/\bacetamin|ibupro|medicina|jarabe/.test(n)) {
    return InventoryCategoria.MEDICAMENTOS;
  }
  return InventoryCategoria.OTRO;
}

function reglasDe(categoria: InventoryCategoria) {
  const alimentos =
    categoria === InventoryCategoria.ALIMENTOS_NO_PERECEDEROS ||
    categoria === InventoryCategoria.AGUA ||
    categoria === InventoryCategoria.ALIMENTO_MASCOTAS;
  const medicinas =
    categoria === InventoryCategoria.MEDICAMENTOS ||
    categoria === InventoryCategoria.MEDICAMENTO_MASCOTAS;
  return {
    requiereLote: alimentos || medicinas,
    requiereVencimiento: alimentos || medicinas,
    esPerecedero: categoria === InventoryCategoria.AGUA || medicinas,
  };
}

function etiquetaCategoria(categoria: InventoryCategoria): string {
  switch (categoria) {
    case InventoryCategoria.ALIMENTOS_NO_PERECEDEROS:
      return 'Alimentos';
    case InventoryCategoria.AGUA:
      return 'Bebidas';
    case InventoryCategoria.ASEO_HIGIENE:
    case InventoryCategoria.PANALES_BEBE:
      return 'Aseo';
    case InventoryCategoria.MEDICAMENTOS:
      return 'Salud';
    default:
      return 'Otro';
  }
}

function scoreFila(
  nombre: string,
  marca: string | null | undefined,
  nombreFila: string,
  marcaFila: string | null,
): number {
  let score = similitudNombres(nombre, nombreFila);
  if (marca && marcaFila && similitudNombres(marca, marcaFila) >= 0.85) {
    score = Math.min(1, score + 0.08);
  }
  return score;
}
