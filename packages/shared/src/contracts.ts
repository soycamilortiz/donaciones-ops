/**
 * Formas de las respuestas del API. Son la fuente de verdad para el front:
 * los DTO de NestJS (que además llevan decoradores de Swagger y validación)
 * se declaran `implements` contra estos tipos, así un cambio en el contrato
 * rompe la compilación en ambos lados.
 */

import type { Producto } from './donaciones.js';
import type {
  AcopioFlujo,
  ConsolidacionEstado,
  ControlLoteEstado,
  ControlModo,
  ControlResultado,
  DemandaEstado,
  DemandaItemTipo,
  DemandaPrioridad,
  DespachoEstado,
  InventoryMovimientoTipo,
  KitInstanciaEstado,
  OrganizationTipo,
  PalletDespachoEstado,
  PlanPalletizacionEstado,
  PutawayEstado,
  RecepcionEstado,
  RecepcionItemEstado,
  RecepcionPresentacion,
  RecepcionTipo,
  ReservaEstado,
  UbicacionEstado,
  UbicacionFuncion,
  UbicacionTipo,
  UnidadLogisticaEstado,
  UnidadLogisticaTipo,
  ViajeEstado,
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
  cantidadEnMuelle?: number;
  cantidadUbicada?: number;
  pendienteUbicar?: boolean;
  cantidadReservada?: number;
  cantidadPreReservada?: number;
  cantidadDisponible?: number;
  balances?: InventoryBalance[];
};

export type InventoryBalance = {
  ubicacionId: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  funcion: UbicacionFuncion;
  reservada?: number;
  disponible?: number;
};

export type Ubicacion = {
  id: string;
  acopioId: string;
  parentId?: string | null;
  codigo: string;
  nombre: string;
  tipo: UbicacionTipo;
  funcion: UbicacionFuncion;
  estado: UbicacionEstado;
  capacidadPesoKg?: number | null;
  capacidadVolumen?: number | null;
  capacidadUnidades?: number | null;
  ocupacionUnidades: number;
  disponibleUnidades?: number | null;
  zonaTemperatura?: string | null;
  permiteAlimentos: boolean;
  permiteMedicamentos: boolean;
  permiteRopa: boolean;
  esSistema: boolean;
  isActive: boolean;
};

export type UbicacionSugerida = Ubicacion & {
  compatible: boolean;
  motivo?: string | null;
};

export type Putaway = {
  id: string;
  codigo: string;
  organizationId: string;
  acopioId: string;
  inventoryItemId: string;
  estado: PutawayEstado;
  lineas: PutawayLinea[];
  inventoryNombre?: string;
  loteCodigo?: string | null;
};

export type PutawayLinea = {
  id: string;
  origenUbicacionId: string;
  origenCodigo?: string;
  destinoUbicacionId: string;
  destinoCodigo?: string;
  cantidad: number;
  estado: PutawayEstado;
};

export type InventoryMovimiento = {
  id: string;
  codigo: string;
  organizationId: string;
  acopioId: string;
  inventoryItemId: string;
  inventoryNombre?: string;
  loteCodigo?: string | null;
  tipo: InventoryMovimientoTipo;
  cantidad: number;
  origenUbicacionId?: string | null;
  origenCodigo?: string | null;
  destinoUbicacionId?: string | null;
  destinoCodigo?: string | null;
  observaciones?: string | null;
  createdAt: string;
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
  alertaValidacion?: 'FALTA_VENCIMIENTO' | null;
};

export type KitComponente = {
  id: string;
  kitId: string;
  productoId: string;
  productoNombre?: string;
  productoSku?: string;
  cantidad: number;
};

export type Kit = {
  id: string;
  organizationId: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  pesoKgEstimado?: number | null;
  altoMEstimado?: number | null;
  esCritico?: boolean;
  isActive: boolean;
  componentes: KitComponente[];
};

export type DemandaItem = {
  id: string;
  demandaId: string;
  tipo: DemandaItemTipo;
  kitId?: string | null;
  kitCodigo?: string | null;
  kitNombre?: string | null;
  productoId?: string | null;
  productoNombre?: string | null;
  cantidadSolicitada: number;
  cantidadCubierta: number;
  cantidadPosible?: number;
  deficit?: number;
};

export type Demanda = {
  id: string;
  codigo: string;
  organizationId: string;
  acopioId: string;
  acopioNombre?: string;
  destinoNombre: string;
  destinoMunicipio?: string | null;
  destinoDepartamento?: string | null;
  prioridad: DemandaPrioridad;
  estado: DemandaEstado;
  fechaRequerida?: string | null;
  poblacionAfectada?: number | null;
  tipoEmergencia?: string | null;
  observaciones?: string | null;
  isActive: boolean;
  items: DemandaItem[];
  cobertura?: number;
  pipeline?: {
    solicitado: number;
    reservado: number;
    armado: number;
    aprobado: number;
    observado: number;
    rechazado: number;
    consolidado: number;
  };
};

export type ReservaAsignacion = {
  id?: string;
  inventoryItemId: string;
  inventoryNombre?: string;
  loteCodigo?: string | null;
  vencimiento?: string | null;
  ubicacionId: string;
  ubicacionCodigo?: string;
  cantidad: number;
};

export type ReservaItem = {
  id: string;
  productoId: string;
  productoNombre?: string;
  cantidadRequerida: number;
  cantidadAsignada: number;
  deficit: number;
  asignaciones: ReservaAsignacion[];
};

export type Reserva = {
  id: string;
  codigo: string;
  organizationId: string;
  acopioId: string;
  demandaId: string;
  demandaCodigo?: string;
  demandaItemId: string;
  kitId?: string | null;
  estado: ReservaEstado;
  cantidad: number;
  observaciones?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
  items: ReservaItem[];
};

export type SimulacionReserva = {
  demandaItemId: string;
  solicitado: number;
  posible: number;
  deficit: number;
  cobertura: number;
  requerimientos: Array<{
    productoId: string;
    productoNombre: string;
    porUnidad: number;
    requerido: number;
    disponible: number;
    cubierto: number;
    deficit: number;
    productosSustitutos?: Array<{ id: string; nombre: string }>;
    plan: ReservaAsignacion[];
  }>;
};

export type PlanEscaso = {
  kitsPosibles: number;
  lineas: Array<{
    demandaId: string;
    demandaCodigo: string;
    destinoNombre: string;
    prioridad: DemandaPrioridad;
    solicitado: number;
    propuesto: number;
    deficit: number;
  }>;
};

export type KitInstanciaItem = {
  id: string;
  productoId: string;
  productoNombre?: string;
  inventoryItemId?: string | null;
  origenUbicacionId?: string | null;
  origenUbicacionCodigo?: string | null;
  loteCodigo?: string | null;
  vencimiento?: string | null;
  cantidad: number;
  pickConfirmadoAt?: string | null;
};

export type KitInstancia = {
  id: string;
  codigo: string;
  reservaId: string;
  demandaId: string;
  kitId: string;
  kitNombre?: string;
  estado: KitInstanciaEstado;
  zonaKittingCodigo?: string | null;
  items: KitInstanciaItem[];
};

export type ControlInspeccion = {
  id: string;
  kitInstanciaId: string;
  kitCodigo?: string;
  resultado: ControlResultado;
  observaciones?: string | null;
  items?: KitInstanciaItem[];
};

export type ControlLote = {
  id: string;
  codigo: string;
  reservaId: string;
  demandaId: string;
  modo: ControlModo;
  muestraObjetivo: number;
  umbralDefecto: number;
  estado: ControlLoteEstado;
  inspeccionados: number;
  defectuosos: number;
  tasaDefecto: number;
  requiereTotal: boolean;
  inspecciones: ControlInspeccion[];
};

export type PropuestaPallet = {
  kitsPorPallet: number;
  pallets: number;
  ultimoPalletKits: number;
  pesoPalletKg: number;
  altoPalletM?: number | null;
};

export type Consolidacion = {
  id: string;
  codigo: string;
  demandaId: string;
  demandaCodigo?: string;
  destinoNombre: string;
  estado: ConsolidacionEstado;
  kitPesoKg: number;
  palletPesoMaxKg: number;
  kitAltoM?: number | null;
  palletAltoMaxM?: number | null;
  kits: number;
  propuesta: PropuestaPallet;
};

export type PipelineDemanda = {
  solicitado: number;
  reservado: number;
  pendientePick: number;
  armado: number;
  aprobado: number;
  observado: number;
  rechazado: number;
  consolidado: number;
  palletizado: number;
};

export type PlanPalletSlot = {
  id: string;
  sequence: number;
  kitsObjetivo: number;
  pesoTeoricoKg: number;
  palletId?: string | null;
  palletCodigo?: string | null;
  palletEstado?: PalletDespachoEstado | null;
  kitsActual: number;
};

export type PalletDespachoItemResumen = {
  id: string;
  kitInstanciaId?: string | null;
  kitCodigo?: string | null;
  escaneadoAt?: string | null;
  retiradoAt?: string | null;
  retiradoMotivo?: string | null;
};

export type PalletDespacho = {
  id: string;
  codigo: string;
  planId: string;
  demandaId: string;
  destinoNombre: string;
  sequence: number;
  estado: PalletDespachoEstado;
  kitsObjetivo: number;
  kitsActual: number;
  pesoPalletKg: number;
  pesoNetoKg?: number | null;
  pesoBrutoKg?: number | null;
  altoM?: number | null;
  anchoM?: number | null;
  largoM?: number | null;
  despachoId?: string | null;
  items: PalletDespachoItemResumen[];
};

export type PlanPalletizacion = {
  id: string;
  codigo: string;
  consolidacionId: string;
  consolidacionCodigo?: string;
  demandaId: string;
  destinoNombre: string;
  estado: PlanPalletizacionEstado;
  palletCount: number;
  kitsPorPallet: number;
  kitPesoKg: number;
  palletPesoMaxKg: number;
  kitsTotal: number;
  palletsListos: number;
  slots: PlanPalletSlot[];
};

export type ViajeResumen = {
  id: string;
  codigo: string;
  estado: ViajeEstado;
  vehiculoPlaca?: string | null;
  transportistaNombre?: string | null;
  conductorNombre?: string | null;
  palletsEsperados: number;
  palletsCargados: number;
  pesoCargadoKg: number;
};

export type DespachoChecklist = {
  cargaCompleta: boolean;
  palletsIdentificados: boolean;
  pesoVerificado: boolean;
  destinoConfirmado: boolean;
  vehiculoConfirmado: boolean;
  conductorConfirmado: boolean;
  documentacionCompleta: boolean;
  sellosRegistrados: boolean;
};

export type DespachoManifiesto = {
  origenNombre: string;
  destinoNombre: string;
  vehiculoPlaca?: string | null;
  conductorNombre?: string | null;
  transportistaNombre?: string | null;
  palletsCount: number;
  kitsCount: number;
  pesoKg: number;
  generadoAt: string;
};

export type Despacho = {
  id: string;
  codigo: string;
  acopioId: string;
  acopioNombre?: string;
  planId: string;
  planCodigo?: string;
  demandaId: string;
  demandaCodigo?: string;
  destinoNombre: string;
  estado: DespachoEstado;
  palletsEsperados: number;
  palletsCargados: number;
  palletsDespachados: number;
  kitsEsperados: number;
  kitsCargados: number;
  kitsDespachados: number;
  pesoTotalKg: number;
  esParcial: boolean;
  observaciones?: string | null;
  vehiculoPlaca?: string | null;
  transportista?: string | null;
  conductorNombre?: string | null;
  conductorDocumento?: string | null;
  documentoTransporte?: string | null;
  salidaProgramada?: string | null;
  salidaReal?: string | null;
  viajes: ViajeResumen[];
  checklist?: DespachoChecklist | null;
  manifiesto?: DespachoManifiesto | null;
  pallets: Array<Pick<PalletDespacho, 'id' | 'codigo' | 'sequence' | 'estado'>>;
};

/** Un permiso conocido del catálogo, o cualquier slug que llegue del servidor. */
export type KnownPermission = PermissionSlug;
export type KnownRole = RoleSlug;
