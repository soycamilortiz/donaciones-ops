import type { PermissionSlug } from '@soschoco/shared';
import type { IconName } from '@/components/atoms/Icon';

type NavLabelKey =
  | 'nav.dashboard'
  | 'nav.users'
  | 'nav.roles'
  | 'nav.acopios'
  | 'nav.locations'
  | 'nav.kits'
  | 'nav.receptions'
  | 'nav.demands'
  | 'nav.despachos'
  | 'nav.transporte'
  | 'nav.rutas'
  | 'nav.entregas'
  | 'nav.inventory';

type DashboardHintKey =
  | 'dashboard.usersHint'
  | 'dashboard.rolesHint'
  | 'dashboard.acopiosHint'
  | 'dashboard.locationsHint'
  | 'dashboard.kitsHint'
  | 'dashboard.receptionsHint'
  | 'dashboard.demandsHint'
  | 'dashboard.despachosHint'
  | 'dashboard.transporteHint'
  | 'dashboard.rutasHint'
  | 'dashboard.entregasHint'
  | 'dashboard.inventoryHint';

export type AppNavItem = {
  href: string;
  labelKey: NavLabelKey;
  icon: IconName;
  exact?: boolean;
  perm: PermissionSlug;
  dashboardHintKey?: DashboardHintKey;
};

/** Orden fijo del menú lateral y tarjetas del resumen. */
export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    href: '/app',
    labelKey: 'nav.dashboard',
    icon: 'grid',
    exact: true,
    perm: 'org:read',
  },
  {
    href: '/app/usuarios',
    labelKey: 'nav.users',
    icon: 'users',
    perm: 'members:read',
    dashboardHintKey: 'dashboard.usersHint',
  },
  {
    href: '/app/roles',
    labelKey: 'nav.roles',
    icon: 'shield',
    perm: 'roles:read',
    dashboardHintKey: 'dashboard.rolesHint',
  },
  {
    href: '/app/acopios',
    labelKey: 'nav.acopios',
    icon: 'home',
    perm: 'acopios:read',
    dashboardHintKey: 'dashboard.acopiosHint',
  },
  {
    href: '/app/ubicaciones',
    labelKey: 'nav.locations',
    icon: 'book',
    perm: 'inventory:write',
    dashboardHintKey: 'dashboard.locationsHint',
  },
  {
    href: '/app/kits',
    labelKey: 'nav.kits',
    icon: 'heart',
    perm: 'inventory:write',
    dashboardHintKey: 'dashboard.kitsHint',
  },
  {
    href: '/app/recepciones',
    labelKey: 'nav.receptions',
    icon: 'swap',
    perm: 'donaciones:read',
    dashboardHintKey: 'dashboard.receptionsHint',
  },
  {
    href: '/app/inventario',
    labelKey: 'nav.inventory',
    icon: 'package',
    perm: 'inventory:read',
    dashboardHintKey: 'dashboard.inventoryHint',
  },
  {
    href: '/app/demandas',
    labelKey: 'nav.demands',
    icon: 'alert-circle',
    perm: 'inventory:write',
    dashboardHintKey: 'dashboard.demandsHint',
  },
  {
    href: '/app/despachos',
    labelKey: 'nav.despachos',
    icon: 'swap',
    perm: 'despacho:read',
    dashboardHintKey: 'dashboard.despachosHint',
  },
  {
    href: '/app/transporte',
    labelKey: 'nav.transporte',
    icon: 'swap',
    perm: 'transporte:read',
    dashboardHintKey: 'dashboard.transporteHint',
  },
  {
    href: '/app/rutas',
    labelKey: 'nav.rutas',
    icon: 'book',
    perm: 'rutas:read',
    dashboardHintKey: 'dashboard.rutasHint',
  },
  {
    href: '/app/entregas',
    labelKey: 'nav.entregas',
    icon: 'package',
    perm: 'entrega:read',
    dashboardHintKey: 'dashboard.entregasHint',
  },
];

export function filterNavItems(
  items: AppNavItem[],
  can: (permission: PermissionSlug) => boolean,
): AppNavItem[] {
  return items.filter((item) => can(item.perm));
}
