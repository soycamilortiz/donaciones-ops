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
} as const;

export type PermissionSlug =
  (typeof PermissionSlug)[keyof typeof PermissionSlug];

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
    descripcion: 'Leer datos de la organización',
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
    descripcion: 'Consultar existencias por centro de acopio',
  },
  {
    slug: PermissionSlug.InventoryWrite,
    nombre: 'Gestionar inventario',
    descripcion: 'Cargar, editar y dar de baja productos en bodega',
  },
];

const ALL_PERMISSIONS = PERMISSION_CATALOG.map((item) => item.slug);

const LECTURA = [
  PermissionSlug.OrgRead,
  PermissionSlug.AcopiosRead,
  PermissionSlug.MembersRead,
  PermissionSlug.RolesRead,
  PermissionSlug.InventoryRead,
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
    descripcion:
      'Quien crea y opera la organización: usuarios, caracterización y bodegas',
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
    descripcion: 'Consulta acopios para retiro y despacho',
    permissions: [
      PermissionSlug.OrgRead,
      PermissionSlug.AcopiosRead,
      PermissionSlug.InventoryRead,
    ],
  },
  {
    slug: RoleSlug.Voluntario,
    nombre: 'Voluntario',
    descripcion: 'Apoyo en campo, solo consulta',
    permissions: [
      PermissionSlug.OrgRead,
      PermissionSlug.AcopiosRead,
      PermissionSlug.InventoryRead,
    ],
  },
];
