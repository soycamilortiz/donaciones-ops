export const PermissionSlug = {
  OrgRead: 'org:read',
  OrgUpdate: 'org:update',
  MembersRead: 'members:read',
  MembersInvite: 'members:invite',
  MembersRole: 'members:role',
  MembersRemove: 'members:remove',
  AcopiosRead: 'acopios:read',
  AcopiosWrite: 'acopios:write',
  RolesRead: 'roles:read',
  RolesWrite: 'roles:write',
  InventoryRead: 'inventory:read',
  InventoryWrite: 'inventory:write',
  DonacionesRead: 'donaciones:read',
  DonacionesWrite: 'donaciones:write',
  DespachoRead: 'despacho:read',
  DespachoWrite: 'despacho:write',
  TransporteRead: 'transporte:read',
  TransporteWrite: 'transporte:write',
  RutasRead: 'rutas:read',
  RutasWrite: 'rutas:write',
  EntregaRead: 'entrega:read',
  EntregaWrite: 'entrega:write',
} as const;

export type PermissionSlug = (typeof PermissionSlug)[keyof typeof PermissionSlug];

export const RoleSlug = {
  AdministradorAcopio: 'administrador_acopio',
  AuxiliarAdministrativo: 'auxiliar_administrativo',
  LiderZona: 'lider_zona',
  Finanzas: 'finanzas',
  Transportador: 'transportador',
  Voluntario: 'voluntario',
} as const;

export type RoleSlug = (typeof RoleSlug)[keyof typeof RoleSlug];

export const PERMISSION_CATALOG: Array<{
  slug: PermissionSlug;
  nombre: string;
  descripcion: string;
}> = [
  {
    slug: PermissionSlug.OrgRead,
    nombre: 'Ver organización',
    descripcion: 'Leer datos de la organización y acceder al resumen',
  },
  {
    slug: PermissionSlug.OrgUpdate,
    nombre: 'Editar organización',
    descripcion: 'Actualizar caracterización de la organización',
  },
  {
    slug: PermissionSlug.MembersRead,
    nombre: 'Ver miembros',
    descripcion: 'Listar usuarios de la organización',
  },
  {
    slug: PermissionSlug.MembersInvite,
    nombre: 'Agregar miembros',
    descripcion: 'Vincular un usuario ya registrado',
  },
  {
    slug: PermissionSlug.MembersRole,
    nombre: 'Cambiar roles',
    descripcion: 'Asignar un rol a un miembro',
  },
  {
    slug: PermissionSlug.MembersRemove,
    nombre: 'Quitar miembros',
    descripcion: 'Retirar a una persona de la organización',
  },
  {
    slug: PermissionSlug.AcopiosRead,
    nombre: 'Ver acopios',
    descripcion: 'Listar centros de acopio',
  },
  {
    slug: PermissionSlug.AcopiosWrite,
    nombre: 'Gestionar acopios',
    descripcion: 'Crear, editar y eliminar centros de acopio',
  },
  {
    slug: PermissionSlug.RolesRead,
    nombre: 'Ver roles',
    descripcion: 'Consultar la matriz de permisos',
  },
  {
    slug: PermissionSlug.RolesWrite,
    nombre: 'Editar roles',
    descripcion: 'Crear roles y cambiar la matriz de permisos',
  },
  {
    slug: PermissionSlug.InventoryRead,
    nombre: 'Ver inventario',
    descripcion: 'Consultar existencias, kits y demandas',
  },
  {
    slug: PermissionSlug.InventoryWrite,
    nombre: 'Gestionar inventario',
    descripcion: 'Ubicaciones, kits, demandas, movimientos y bodega',
  },
  {
    slug: PermissionSlug.DonacionesRead,
    nombre: 'Ver recepciones',
    descripcion: 'Consultar recepciones, unidades y líneas identificadas',
  },
  {
    slug: PermissionSlug.DonacionesWrite,
    nombre: 'Registrar recepciones',
    descripcion: 'Abrir una recepción, identificar productos con foto y validar el ingreso',
  },
  {
    slug: PermissionSlug.DespachoRead,
    nombre: 'Ver despachos',
    descripcion: 'Consultar planes de palletización, carga y salida de bodega',
  },
  {
    slug: PermissionSlug.DespachoWrite,
    nombre: 'Gestionar despachos',
    descripcion: 'Armar pallets, cargar camión y confirmar salida',
  },
  {
    slug: PermissionSlug.TransporteRead,
    nombre: 'Ver transporte',
    descripcion: 'Torre de control TMS, viajes, flota y seguimiento',
  },
  {
    slug: PermissionSlug.TransporteWrite,
    nombre: 'Operar transporte',
    descripcion: 'Paradas, eventos, asignación de pallets y maestros de flota',
  },
  {
    slug: PermissionSlug.RutasRead,
    nombre: 'Ver rutas',
    descripcion: 'Consultar plantillas multiparada',
  },
  {
    slug: PermissionSlug.RutasWrite,
    nombre: 'Gestionar rutas',
    descripcion: 'Crear y editar plantillas de ruta',
  },
  {
    slug: PermissionSlug.EntregaRead,
    nombre: 'Ver entregas',
    descripcion: 'Consultar entregas pendientes y prueba de entrega',
  },
  {
    slug: PermissionSlug.EntregaWrite,
    nombre: 'Confirmar entregas',
    descripcion: 'Registrar POD y cierre de entrega en destino',
  },
];

const ALL_PERMISSIONS = PERMISSION_CATALOG.map((item) => item.slug);

const LECTURA = [
  PermissionSlug.OrgRead,
  PermissionSlug.AcopiosRead,
  PermissionSlug.MembersRead,
  PermissionSlug.RolesRead,
  PermissionSlug.InventoryRead,
  PermissionSlug.DonacionesRead,
  PermissionSlug.DespachoRead,
  PermissionSlug.TransporteRead,
  PermissionSlug.RutasRead,
  PermissionSlug.EntregaRead,
] as const;

const LOGISTICA_OPERACION = [
  PermissionSlug.DespachoRead,
  PermissionSlug.DespachoWrite,
  PermissionSlug.TransporteRead,
  PermissionSlug.TransporteWrite,
  PermissionSlug.RutasRead,
  PermissionSlug.RutasWrite,
  PermissionSlug.EntregaRead,
  PermissionSlug.EntregaWrite,
] as const;

export const ROLE_CATALOG: Array<{
  slug: RoleSlug;
  nombre: string;
  descripcion: string;
  permissions: PermissionSlug[];
}> = [
  {
    slug: RoleSlug.AdministradorAcopio,
    nombre: 'Administrador de acopio',
    descripcion: 'Quien crea y opera la organización: usuarios, caracterización y bodegas',
    permissions: ALL_PERMISSIONS,
  },
  {
    slug: RoleSlug.AuxiliarAdministrativo,
    nombre: 'Auxiliar administrativo',
    descripcion: 'Gestión de personas y datos de la organización',
    permissions: [
      PermissionSlug.OrgRead,
      PermissionSlug.OrgUpdate,
      PermissionSlug.MembersRead,
      PermissionSlug.MembersInvite,
      PermissionSlug.MembersRole,
      PermissionSlug.MembersRemove,
      PermissionSlug.AcopiosRead,
      PermissionSlug.RolesRead,
      PermissionSlug.RolesWrite,
      PermissionSlug.InventoryRead,
      PermissionSlug.InventoryWrite,
      PermissionSlug.DonacionesRead,
      PermissionSlug.DonacionesWrite,
      ...LOGISTICA_OPERACION,
    ],
  },
  {
    slug: RoleSlug.LiderZona,
    nombre: 'Líder de zona',
    descripcion: 'Coordina acopios de su zona',
    permissions: [
      PermissionSlug.OrgRead,
      PermissionSlug.MembersRead,
      PermissionSlug.AcopiosRead,
      PermissionSlug.AcopiosWrite,
      PermissionSlug.RolesRead,
      PermissionSlug.InventoryRead,
      PermissionSlug.InventoryWrite,
      PermissionSlug.DonacionesRead,
      PermissionSlug.DonacionesWrite,
      ...LOGISTICA_OPERACION,
    ],
  },
  {
    slug: RoleSlug.Finanzas,
    nombre: 'Finanzas',
    descripcion: 'Consulta operativa para control económico',
    permissions: [...LECTURA],
  },
  {
    slug: RoleSlug.Transportador,
    nombre: 'Transportador',
    descripcion: 'Seguimiento de viajes y confirmación de entregas en campo',
    permissions: [
      PermissionSlug.OrgRead,
      PermissionSlug.AcopiosRead,
      PermissionSlug.InventoryRead,
      PermissionSlug.DonacionesRead,
      PermissionSlug.TransporteRead,
      PermissionSlug.TransporteWrite,
      PermissionSlug.EntregaRead,
      PermissionSlug.EntregaWrite,
    ],
  },
  {
    slug: RoleSlug.Voluntario,
    nombre: 'Voluntario',
    descripcion: 'Apoyo en campo: consulta de inventario y registro de donaciones',
    permissions: [
      PermissionSlug.OrgRead,
      PermissionSlug.AcopiosRead,
      PermissionSlug.InventoryRead,
      PermissionSlug.DonacionesRead,
      PermissionSlug.DonacionesWrite,
    ],
  },
];
