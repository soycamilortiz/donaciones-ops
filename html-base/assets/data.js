/* ============================================================
   Enums y catálogos — copiados literalmente de
   packages/shared/src/enums.ts y packages/shared/src/rbac.ts
   Nada de esto está inventado.
   ============================================================ */

export const ORGANIZATION_TIPOS = [
  { value: 'CENTRO_ACOPIO', label: 'Centro de acopio' },
  { value: 'RESCATE', label: 'Rescate' },
  { value: 'OLLA_COMUNITARIA', label: 'Olla comunitaria' },
  { value: 'INSTITUCION', label: 'Institución' },
  { value: 'OTRO', label: 'Otro' },
];

export const ACOPIO_FLUJOS = [
  { value: 'RECIBIR', label: 'Recibir donaciones' },
  { value: 'ENVIAR', label: 'Enviar donaciones' },
  { value: 'AMBOS', label: 'Recibir y enviar' },
];

export const INVENTORY_CATEGORIAS = [
  { value: 'ALIMENTOS_NO_PERECEDEROS', label: 'Alimentos no perecederos' },
  { value: 'AGUA', label: 'Agua' },
  { value: 'ASEO_HIGIENE', label: 'Aseo e higiene' },
  { value: 'PANALES_BEBE', label: 'Pañales y elementos de bebé' },
  { value: 'MEDICAMENTOS', label: 'Medicamentos y primeros auxilios' },
  { value: 'ROPA_CALZADO', label: 'Prendas de vestir y calzado' },
  { value: 'COLCHONETAS_COBIJAS', label: 'Colchonetas, cobijas y abrigo' },
  { value: 'ALIMENTO_MASCOTAS', label: 'Alimento para mascotas' },
  { value: 'MEDICAMENTO_MASCOTAS', label: 'Medicamento para mascotas' },
  { value: 'LOGISTICA_RESCATE', label: 'Logística, emergencia y rescate' },
  { value: 'MENAJE_COCINA', label: 'Menaje y utensilios de cocina' },
  { value: 'DESECHABLES', label: 'Desechables' },
  { value: 'OTRO', label: 'Otro' },
];

export const INVENTORY_UNIDADES = [
  { value: 'UNIDAD', label: 'Unidad' }, { value: 'LIBRA', label: 'Libra' },
  { value: 'KILO', label: 'Kilo' }, { value: 'LITRO', label: 'Litro' },
  { value: 'BOTELLA', label: 'Botella' }, { value: 'LATA', label: 'Lata' },
  { value: 'PAQUETE', label: 'Paquete' }, { value: 'CAJA', label: 'Caja' },
  { value: 'GALON', label: 'Galón' }, { value: 'FRASCO', label: 'Frasco' },
  { value: 'TABLETA', label: 'Tableta' }, { value: 'DOCENA', label: 'Docena' },
  { value: 'OTRO', label: 'Otra unidad' },
];

export const INVENTORY_ESTADOS = [
  { value: 'NUEVO', label: 'Nuevo' },
  { value: 'BUEN_ESTADO', label: 'Buen estado' },
  { value: 'USADO', label: 'Usado' },
  { value: 'PROXIMO_A_VENCER', label: 'Próximo a vencer' },
  { value: 'VENCIDO', label: 'Vencido' },
  { value: 'NO_APLICA', label: 'No aplica' },
];

export const INVENTORY_DESTINATARIOS = [
  { value: 'NO_APLICA', label: 'No aplica' }, { value: 'UNISEX', label: 'Unisex' },
  { value: 'MUJER', label: 'Mujer' }, { value: 'HOMBRE', label: 'Hombre' },
  { value: 'NINO', label: 'Niño' }, { value: 'NINA', label: 'Niña' },
  { value: 'BEBE', label: 'Bebé' }, { value: 'MASCOTA', label: 'Mascota' },
];

export const DONACION_ESTADOS = {
  PENDIENTE: { label: 'En cola', variant: 'neutral' },
  PROCESANDO: { label: 'Procesando', variant: 'info' },
  PROCESADA: { label: 'Procesada', variant: 'ok' },
  FALLIDA: { label: 'Fallida', variant: 'danger' },
};

export const PERMISSIONS = [
  { slug: 'org:read', nombre: 'Ver organización' },
  { slug: 'org:update', nombre: 'Editar organización' },
  { slug: 'members:read', nombre: 'Ver miembros' },
  { slug: 'members:invite', nombre: 'Agregar miembros' },
  { slug: 'members:role', nombre: 'Cambiar roles' },
  { slug: 'members:remove', nombre: 'Quitar miembros' },
  { slug: 'acopios:read', nombre: 'Ver acopios' },
  { slug: 'acopios:write', nombre: 'Gestionar acopios' },
  { slug: 'roles:read', nombre: 'Ver roles' },
  { slug: 'roles:write', nombre: 'Editar roles' },
  { slug: 'inventory:read', nombre: 'Ver inventario' },
  { slug: 'inventory:write', nombre: 'Gestionar inventario' },
  { slug: 'donaciones:read', nombre: 'Ver recepciones' },
  { slug: 'donaciones:write', nombre: 'Registrar recepciones' },
];

const ALL = PERMISSIONS.map((p) => p.slug);
const LECTURA = ['org:read', 'acopios:read', 'members:read', 'roles:read', 'inventory:read', 'donaciones:read'];

export const ROLES = [
  { slug: 'administrador_acopio', nombre: 'Administrador de acopio', permissions: ALL, locked: true },
  { slug: 'auxiliar_administrativo', nombre: 'Auxiliar administrativo', permissions: ALL.filter((p) => p !== 'acopios:write') },
  { slug: 'lider_zona', nombre: 'Líder de zona', permissions: ['org:read', 'members:read', 'acopios:read', 'acopios:write', 'roles:read', 'inventory:read', 'inventory:write', 'donaciones:read', 'donaciones:write'] },
  { slug: 'finanzas', nombre: 'Finanzas', permissions: [...LECTURA] },
  { slug: 'transportador', nombre: 'Transportador', permissions: ['org:read', 'acopios:read', 'inventory:read', 'donaciones:read'] },
  { slug: 'voluntario', nombre: 'Voluntario', permissions: ['org:read', 'acopios:read', 'inventory:read', 'donaciones:read', 'donaciones:write'] },
];

/* ---------------------------------------------------------- datos de ejemplo */

export const ORG = {
  id: 'org-1',
  nombre: 'Corporación Pueblo Negro Fuerte',
  correo: 'contacto@example.org',
  tipo: 'OTRO',
  tipoDetalle: 'Junta de acción comunal',
};

export const ME = {
  usuario: 'marta.palacios',
  nombre: 'Marta Palacios',
  correo: 'marta.palacios@example.org',
  iniciales: 'MP',
  roleSlug: 'administrador_acopio',
};

export const ACOPIOS = [
  { id: 'a1', nombre: 'Bodega Quibdó Centro', flujo: 'AMBOS', municipio: 'Quibdó', direccion: 'Calle 24 #5-18', telefono: '+57 000 000 0000', isActive: true },
  { id: 'a2', nombre: 'Punto Bahía Solano', flujo: 'RECIBIR', municipio: 'Bahía Solano', direccion: '', telefono: '', isActive: true },
  { id: 'a3', nombre: 'Acopio Nuquí', flujo: 'ENVIAR', municipio: 'Nuquí', direccion: '', telefono: '', isActive: true },
  { id: 'a4', nombre: 'Bodega Istmina', flujo: 'RECIBIR', municipio: 'Istmina', direccion: 'Carrera 3 #12-40', telefono: '', isActive: false },
];

export const INVENTORY = [
  { id: 'i1', acopioId: 'a1', nombre: 'Arroz blanco', marca: 'Diana', presentacion: '500 g', sku: 'SKU-0412', categoria: 'ALIMENTOS_NO_PERECEDEROS', cantidad: 240, unidad: 'KILO', vencimiento: '2026-11-30', estado: 'BUEN_ESTADO', loteCodigo: 'L-1180', isActive: true },
  { id: 'i2', acopioId: 'a1', nombre: 'Agua en bolsa', marca: 'Cristal', presentacion: '360 ml', sku: '', categoria: 'AGUA', cantidad: 1200, unidad: 'UNIDAD', vencimiento: '', estado: 'NUEVO', loteCodigo: '', isActive: true },
  { id: 'i3', acopioId: 'a1', nombre: 'Acetaminofén 500 mg', marca: 'Genfar', presentacion: 'x100', sku: '', categoria: 'MEDICAMENTOS', cantidad: 30, unidad: 'FRASCO', vencimiento: '2026-09-12', estado: 'PROXIMO_A_VENCER', loteCodigo: 'L-2291', isActive: true },
  { id: 'i4', acopioId: 'a1', nombre: 'Pañales etapa 3', marca: 'Winny', presentacion: 'x40', sku: '', categoria: 'PANALES_BEBE', cantidad: 85, unidad: 'PAQUETE', vencimiento: '', estado: 'NUEVO', loteCodigo: '', isActive: true },
  { id: 'i5', acopioId: 'a1', nombre: 'Cobija sencilla', marca: '', presentacion: '1,50 × 2,00 m', sku: '', categoria: 'COLCHONETAS_COBIJAS', cantidad: 150, unidad: 'UNIDAD', vencimiento: '', estado: 'USADO', loteCodigo: '', isActive: true },
  { id: 'i6', acopioId: 'a1', nombre: 'Atún en lata', marca: "Van Camp's", presentacion: '160 g', sku: '', categoria: 'ALIMENTOS_NO_PERECEDEROS', cantidad: 48, unidad: 'LATA', vencimiento: '2027-03-01', estado: 'BUEN_ESTADO', loteCodigo: '', isActive: true },
  { id: 'i7', acopioId: 'a1', nombre: 'Toallas higiénicas', marca: 'Nosotras', presentacion: 'x10', sku: '', categoria: 'ASEO_HIGIENE', cantidad: 200, unidad: 'PAQUETE', vencimiento: '', estado: 'NUEVO', loteCodigo: '', isActive: true },
  { id: 'i8', acopioId: 'a1', nombre: 'Leche en polvo', marca: 'Klim', presentacion: '400 g', sku: '', categoria: 'PANALES_BEBE', cantidad: 24, unidad: 'LATA', vencimiento: '2026-08-28', estado: 'VENCIDO', loteCodigo: '', isActive: true },
  { id: 'i9', acopioId: 'a1', nombre: 'Jabón de barra', marca: 'Rey', presentacion: '300 g', sku: '', categoria: 'ASEO_HIGIENE', cantidad: 60, unidad: 'UNIDAD', vencimiento: '', estado: 'NUEVO', loteCodigo: '', isActive: false },
  { id: 'i10', acopioId: 'a2', nombre: 'Panela', marca: '', presentacion: '1 kg', sku: '', categoria: 'ALIMENTOS_NO_PERECEDEROS', cantidad: 90, unidad: 'KILO', vencimiento: '2027-01-15', estado: 'BUEN_ESTADO', loteCodigo: '', isActive: true },
  { id: 'i11', acopioId: 'a2', nombre: 'Suero oral', marca: 'Pedialyte', presentacion: '500 ml', sku: '', categoria: 'MEDICAMENTOS', cantidad: 40, unidad: 'BOTELLA', vencimiento: '2026-10-02', estado: 'PROXIMO_A_VENCER', loteCodigo: '', isActive: true },
];

export const MEMBERS = [
  { id: 'm1', nombre: 'Marta Palacios', usuario: 'marta.palacios', correo: 'marta.palacios@example.org', roleSlug: 'administrador_acopio', isActive: true },
  { id: 'm2', nombre: 'Yeimy Mosquera', usuario: 'yeimy.mosquera', correo: 'yeimy.mosquera@example.org', roleSlug: 'lider_zona', isActive: true },
  { id: 'm3', nombre: 'Julio Rentería', usuario: 'julio.renteria', correo: 'julio.renteria@example.org', roleSlug: 'voluntario', isActive: true },
  { id: 'm4', nombre: 'Aníbal Córdoba', usuario: 'anibal.cordoba', correo: 'anibal.cordoba@example.org', roleSlug: 'transportador', isActive: true },
  { id: 'm5', nombre: 'Edilberto Perea', usuario: 'edilberto.perea', correo: 'edilberto.perea@example.org', roleSlug: 'transportador', isActive: true },
  { id: 'm6', nombre: 'Nury Asprilla', usuario: 'nury.asprilla', correo: 'nury.asprilla@example.org', roleSlug: 'auxiliar_administrativo', isActive: false },
];

/** Cuentas que ya existen: invitar a un correo fuera de esta lista falla. */
export const CUENTAS_REGISTRADAS = MEMBERS.map((m) => m.correo).concat('lucia.moreno@example.org');

export const PRODUCTOS = [
  { id: 'p1', nombre: 'Arroz blanco', marca: 'Diana' },
  { id: 'p2', nombre: 'Agua en bolsa', marca: 'Cristal' },
  { id: 'p3', nombre: 'Acetaminofén 500 mg', marca: 'Genfar' },
  { id: 'p4', nombre: 'Atún en lata', marca: "Van Camp's" },
  { id: 'p5', nombre: 'Pañales etapa 3', marca: 'Winny' },
];

export const DONACIONES = [
  { id: 'd1', producto: 'Arroz blanco Diana 500 g', acopioId: 'a1', confianza: 0.94, estado: 'PROCESADA', fecha: '16/08/2026', art: 'lata' },
  { id: 'd2', producto: 'Agua en bolsa Cristal 360 ml', acopioId: 'a1', confianza: 0.88, estado: 'PROCESADA', fecha: '16/08/2026', art: 'botella' },
  { id: 'd3', producto: null, acopioId: 'a2', confianza: 0.41, estado: 'PROCESADA', fecha: '16/08/2026', art: 'caja', ocr: 'ARR0Z BLANC0 · 5OOg · reg. INV1MA' },
  { id: 'd4', producto: 'Acetaminofén 500 mg Genfar', acopioId: 'a1', confianza: 0.76, estado: 'PROCESANDO', fecha: '16/08/2026', art: 'caja' },
  { id: 'd5', producto: null, acopioId: null, confianza: null, estado: 'PENDIENTE', fecha: '16/08/2026', art: 'bolsa' },
  { id: 'd6', producto: null, acopioId: 'a2', confianza: null, estado: 'FALLIDA', fecha: '15/08/2026', art: 'caja', error: 'Timeout del worker tras 3 intentos.' },
  { id: 'd7', producto: null, acopioId: 'a1', confianza: null, estado: 'PROCESADA', fecha: '15/08/2026', art: 'bolsa', ocr: '' },
];

export const label = (list, value) => (list.find((i) => i.value === value)?.label ?? value);
export const acopioName = (id) => ACOPIOS.find((a) => a.id === id)?.nombre ?? null;
export const roleName = (slug) => ROLES.find((r) => r.slug === slug)?.nombre ?? slug;
