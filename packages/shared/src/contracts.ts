/**
 * Formas de las respuestas del API. Son la fuente de verdad para el front:
 * los DTO de NestJS (que además llevan decoradores de Swagger y validación)
 * se declaran `implements` contra estos tipos, así un cambio en el contrato
 * rompe la compilación en ambos lados.
 */

import type { Producto } from './donaciones.js';
import type {
  AcopioFlujo,
  OrganizationTipo,
  RecepcionEstado,
  RecepcionItemEstado,
  RecepcionPresentacion,
  RecepcionTipo,
  UnidadLogisticaEstado,
  UnidadLogisticaTipo,
} from './enums.js';
import type { PermissionSlug, RoleSlug } from './rbac.js';

export type AuthUser = {
  id: string;
  usuario: string;
  nombre: string;
  correo: string;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

export type RegisterPendingVerification = {
  pendingVerification: true;
  correo: string;
};

export type RegisterResult = AuthSession | RegisterPendingVerification;

export type GoogleProfilePending = {
  needsProfile: true;
  profileToken: string;
  correo: string;
  nombre: string;
  usuarioSugerido: string;
};

export type GoogleAuthResult = AuthSession | GoogleProfilePending;

export type Captcha = {
  captchaId: string;
  svg: string;
  /** `true` cuando el API corre con CAPTCHA_DISABLED: el front no lo dibuja. */
  disabled?: boolean;
};

export type Permission = {
  slug: string;
  nombre: string;
  descripcion?: string | null;
};

export type Role = {
  id: string;
  slug: string;
  nombre: string;
  descripcion?: string | null;
  isActive: boolean;
  permissions: Permission[];
};

export type Membership = {
  id: string;
  isPrimary: boolean;
  role: { id: string; slug: string; nombre: string };
  organization: { id: string; nombre: string; tipo: string };
  permissions: string[];
};

export type Me = {
  id: string;
  usuario: string;
  nombre: string;
  correo: string;
  memberships: Membership[];
};

export type Member = {
  membershipId: string;
  userId: string;
  usuario: string;
  nombre: string;
  correo: string;
  isPrimary: boolean;
  isActive: boolean;
  roleSlug: string;
  roleNombre: string;
};

export type Organization = {
  id: string;
  nombre: string;
  correo: string;
  tipo: OrganizationTipo;
  tipoDetalle?: string | null;
  telefono?: string | null;
  descripcion?: string | null;
};

export type Acopio = {
  id: string;
  nombre: string;
  flujo: AcopioFlujo;
  telefono?: string | null;
  descripcion?: string | null;
  departamento?: string | null;
  municipio?: string | null;
  direccion?: string | null;
  lat?: number | null;
  lng?: number | null;
  isActive: boolean;
};

export type InventoryItem = {
  id: string;
  acopioId: string;
  nombre: string;
  categoria: string;
  categoriaDetalle?: string | null;
  sku?: string | null;
  marca?: string | null;
  presentacion?: string | null;
  talla?: string | null;
  destinatario: string;
  cantidad: number;
  unidad: string;
  unidadDetalle?: string | null;
  vencimiento?: string | null;
  estado: string;
  loteCodigo?: string | null;
  ubicacionInterna?: string | null;
  donanteNombre?: string | null;
  donanteContacto?: string | null;
  observaciones?: string | null;
  isActive: boolean;
};

export type Recepcion = {
  id: string;
  codigo: string;
  organizationId: string;
  acopioId: string;
  acopioNombre?: string;
  tipo: RecepcionTipo;
  presentacionFisica: RecepcionPresentacion;
  estado: RecepcionEstado;
  recibidaEn: string;
  donanteNombre?: string | null;
  donanteContacto?: string | null;
  procedencia?: string | null;
  transportista?: string | null;
  vehiculoPlaca?: string | null;
  documentoTransporte?: string | null;
  observaciones?: string | null;
  responsableId: string;
  validadaEn?: string | null;
  isActive: boolean;
  unidades: UnidadLogistica[];
  items: RecepcionItem[];
};

export type UnidadLogistica = {
  id: string;
  codigo: string;
  nroEnRecepcion: number;
  tipo: UnidadLogisticaTipo;
  estado: UnidadLogisticaEstado;
  observaciones?: string | null;
};

export type Lote = {
  id: string;
  codigo: string;
  codigoOrigen?: string | null;
  vencimiento?: string | null;
};

export type RecepcionItem = {
  id: string;
  unidadLogisticaId?: string | null;
  productoId?: string | null;
  loteId?: string | null;
  inventoryItemId?: string | null;
  cantidadRecibida: number;
  cantidadAprobada: number;
  cantidadCuarentena: number;
  cantidadRechazada: number;
  unidad: string;
  pesoKg?: number | null;
  estadoLinea: RecepcionItemEstado;
  observaciones?: string | null;
  producto?: Producto | null;
  lote?: Lote | null;
  unidadLogistica?: Pick<UnidadLogistica, 'id' | 'codigo' | 'nroEnRecepcion' | 'tipo'> | null;
};

/** Un permiso conocido del catálogo, o cualquier slug que llegue del servidor. */
export type KnownPermission = PermissionSlug;
export type KnownRole = RoleSlug;
