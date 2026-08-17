import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { Input } from '@/components/atoms/Input';
import { FormField } from '@/components/molecules/FormField';
import { useToast } from '@/components/molecules/Toast';
import { cn } from '@/lib/utils';
import { SkeletonList } from '../components/atoms/Skeleton';
import { ConfirmDialog } from '../components/molecules/ConfirmDialog';
import { useOrg } from '../components/OrgGate';
import type { Permission, Role } from '../lib/api';
import { useApi } from '../lib/useApi';

// El rol que garantiza acceso total no se edita ni se da de baja (UX-029).
const ROL_BLOQUEADO = 'administrador_acopio';

export default function RolesPage() {
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const { avisar } = useToast();
  const request = useApi();
  const writable = can('roles:write');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  // Rol pendiente de confirmar; null = dialogo cerrado.
  const [porConfirmar, setPorConfirmar] = useState<Role | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [saving, setSaving] = useState(false);
  // Rol elegido en la vista de una sola columna (móvil); null = usa el primero.
  const [rolMovil, setRolMovil] = useState<string | null>(null);

  async function load() {
    const [roleRows, permissionRows] = await Promise.all([
      request<Role[]>('/api/v1/roles'),
      request<Permission[]>('/api/v1/permissions'),
    ]);
    setRoles(roleRows);
    setPermissions(permissionRows);
    setCargando(false);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load() se redefine en cada render; orgId es el disparador real de la recarga.
  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : t('common.loadError'));
    });
  }, [orgId]);

  const matrix = useMemo(() => {
    return permissions.map((permission) => ({
      permission,
      flags: roles.map((role) => role.permissions.some((item) => item.slug === permission.slug)),
    }));
  }, [permissions, roles]);

  const selectedRole = roles.find((role) => role.id === rolMovil) ?? roles[0];

  async function toggle(role: Role, slug: string, enabled: boolean) {
    if (!writable) {
      return;
    }
    setError(null);
    setSaving(true);
    const next = enabled
      ? [...new Set([...role.permissions.map((item) => item.slug), slug])]
      : role.permissions.map((item) => item.slug).filter((item) => item !== slug);
    try {
      const updated = await request<Role>(
        `/api/v1/organizations/${orgId}/roles/${role.id}/permissions`,
        { method: 'PUT', body: JSON.stringify({ permissionSlugs: next }) },
      );
      setRoles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      avisar(t('roles.permissionsSaved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('roles.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function patchRole(
    roleId: string,
    body: { nombre?: string; descripcion?: string; isActive?: boolean },
  ) {
    if (!writable) {
      return;
    }
    setError(null);
    try {
      const updated = await request<Role>(`/api/v1/organizations/${orgId}/roles/${roleId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setRoles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      avisar(t('common.saved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('roles.renameError'));
    }
  }

  async function renamePermission(permission: Permission, nombre: string) {
    if (!writable) {
      return;
    }
    const next = nombre.trim();
    if (next === permission.nombre) {
      return;
    }
    setError(null);
    try {
      const updated = await request<Permission>(
        `/api/v1/organizations/${orgId}/permissions/${permission.slug}`,
        { method: 'PATCH', body: JSON.stringify({ nombre: next }) },
      );
      setPermissions((current) =>
        current.map((item) => (item.slug === updated.slug ? updated : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('roles.permissionError'));
    }
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!writable) {
      return;
    }
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const created = await request<Role>(`/api/v1/organizations/${orgId}/roles`, {
        method: 'POST',
        body: JSON.stringify({
          nombre: String(data.get('nombre') ?? '').trim(),
          descripcion: String(data.get('descripcion') ?? '').trim() || undefined,
        }),
      });
      form.reset();
      setRoles((current) => [...current, created]);
      avisar(t('roles.created'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('roles.createError'));
    }
  }

  async function onDelete(role: Role) {
    if (!writable) {
      return;
    }
    // UX-030: marca ocupado antes del await para que el diálogo muestre
    // «Procesando…» y el botón no pueda dispararse dos veces.
    setEliminando(true);
    setError(null);
    try {
      await request(`/api/v1/organizations/${orgId}/roles/${role.id}`, {
        method: 'DELETE',
      });
      await load();
      avisar(t('roles.deleted'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('roles.deleteError'));
    } finally {
      setEliminando(false);
      setPorConfirmar(null);
    }
  }

  return (
    <section className="space-y-6 py-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{t('roles.title')}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t('roles.subtitle')}</p>
        </div>
        {saving ? (
          <span role="status" className="text-sm font-medium text-muted-foreground">
            {t('common.saving')}
          </span>
        ) : null}
      </div>

      {/* UX-029: banner persistente que explica por qué el rol total está bloqueado. */}
      <div
        role="note"
        className="flex flex-wrap items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft p-4"
      >
        <Icon name="alert-circle" className="mt-0.5 shrink-0 text-warning" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">{t('roles.lockedTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('roles.lockedText')}</p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <SkeletonList filas={5} etiqueta={t('common.loading')} />
      ) : (
        <>
          {/* UX-013 · móvil: un rol a la vez con una lista de interruptores. */}
          <div className="space-y-4 sm:hidden">
            <div role="tablist" aria-label={t('roles.pickRole')} className="flex flex-wrap gap-2">
              {roles.map((role) => {
                const active = role.id === selectedRole?.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setRolMovil(role.id)}
                    className={cn(
                      'min-h-11 rounded-pill px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground hover:bg-muted',
                    )}
                  >
                    {role.nombre}
                  </button>
                );
              })}
            </div>

            {selectedRole ? (
              <div className="space-y-4">
                {writable ? (
                  <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                    <FormField label={t('roles.roleName')} htmlFor="m-role-nombre">
                      <Input
                        key={`${selectedRole.id}-m-nombre`}
                        id="m-role-nombre"
                        defaultValue={selectedRole.nombre}
                        aria-label={t('roles.roleNameAria', { name: selectedRole.nombre })}
                        onBlur={(event) => {
                          const nombre = event.target.value.trim();
                          if (nombre && nombre !== selectedRole.nombre) {
                            void patchRole(selectedRole.id, { nombre });
                          }
                        }}
                      />
                    </FormField>
                    <FormField label={t('roles.description')} htmlFor="m-role-desc">
                      <Input
                        key={`${selectedRole.id}-m-desc`}
                        id="m-role-desc"
                        defaultValue={selectedRole.descripcion ?? ''}
                        placeholder={t('roles.description')}
                        aria-label={t('roles.roleDescAria', { name: selectedRole.nombre })}
                        onBlur={(event) => {
                          const descripcion = event.target.value.trim();
                          if (descripcion !== (selectedRole.descripcion ?? '')) {
                            void patchRole(selectedRole.id, { descripcion });
                          }
                        }}
                      />
                    </FormField>
                    {selectedRole.slug !== ROL_BLOQUEADO ? (
                      selectedRole.isActive === false ? (
                        <Button
                          variant="outline"
                          onClick={() => void patchRole(selectedRole.id, { isActive: true })}
                        >
                          {t('roles.reactivate')}
                        </Button>
                      ) : (
                        <Button variant="ghost" onClick={() => setPorConfirmar(selectedRole)}>
                          {t('roles.deactivate')}
                        </Button>
                      )
                    ) : null}
                  </div>
                ) : null}

                <h2 className="sr-only">
                  {t('roles.permissionsFor', { name: selectedRole.nombre })}
                </h2>
                <ul className="space-y-2">
                  {permissions.map((permission) => {
                    const on = selectedRole.permissions.some(
                      (item) => item.slug === permission.slug,
                    );
                    const locked = selectedRole.slug === ROL_BLOQUEADO;
                    return (
                      <li key={permission.slug}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={t('roles.permissionForRole', {
                            permission: permission.nombre,
                            role: selectedRole.nombre,
                          })}
                          disabled={!writable || locked}
                          onClick={() => void toggle(selectedRole, permission.slug, !on)}
                          className={cn(
                            'flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed motion-reduce:transition-none',
                            locked ? 'opacity-70' : 'hover:bg-background',
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {permission.nombre}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {permission.slug}
                            </span>
                          </span>
                          <span
                            aria-hidden
                            className={cn(
                              'relative h-6 w-11 shrink-0 rounded-pill transition-colors motion-reduce:transition-none',
                              on ? 'bg-primary' : 'bg-border',
                            )}
                          >
                            <span
                              className={cn(
                                'absolute left-0.5 top-0.5 h-5 w-5 rounded-pill bg-card shadow transition-transform motion-reduce:transition-none',
                                on ? 'translate-x-5' : 'translate-x-0',
                              )}
                            />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>

          {/* UX-013 · >=600px: matriz completa con encabezado y esquina fijos. */}
          <div className="hidden max-h-[70vh] overflow-auto rounded-lg border border-border sm:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 min-w-[240px] border-b border-r border-border bg-card px-4 py-3 text-left font-bold text-foreground">
                    {t('roles.permission')}
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role.id}
                      className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3 text-center align-top font-semibold text-foreground"
                    >
                      {writable ? (
                        <div className="flex min-w-[160px] flex-col gap-2 text-left">
                          <Input
                            key={`${role.id}-nombre`}
                            defaultValue={role.nombre}
                            aria-label={t('roles.roleNameAria', { name: role.nombre })}
                            onBlur={(event) => {
                              const nombre = event.target.value.trim();
                              if (nombre && nombre !== role.nombre) {
                                void patchRole(role.id, { nombre });
                              }
                            }}
                          />
                          <Input
                            key={`${role.id}-desc`}
                            defaultValue={role.descripcion ?? ''}
                            placeholder={t('roles.description')}
                            aria-label={t('roles.roleDescAria', { name: role.nombre })}
                            onBlur={(event) => {
                              const descripcion = event.target.value.trim();
                              if (descripcion !== (role.descripcion ?? '')) {
                                void patchRole(role.id, { descripcion });
                              }
                            }}
                          />
                          {role.slug !== ROL_BLOQUEADO ? (
                            role.isActive === false ? (
                              <Button
                                variant="link"
                                className="self-start text-xs"
                                onClick={() => void patchRole(role.id, { isActive: true })}
                              >
                                {t('roles.reactivate')}
                              </Button>
                            ) : (
                              <Button
                                variant="link"
                                className="self-start text-xs"
                                onClick={() => setPorConfirmar(role)}
                              >
                                {t('roles.deactivate')}
                              </Button>
                            )
                          ) : null}
                        </div>
                      ) : (
                        <>
                          {role.nombre}
                          {role.descripcion ? (
                            <div className="text-xs font-normal text-muted-foreground">
                              {role.descripcion}
                            </div>
                          ) : null}
                        </>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.permission.slug} className="border-b border-border last:border-b-0">
                    <td className="sticky left-0 z-10 min-w-[240px] border-r border-border bg-card px-4 py-3 align-top">
                      {writable ? (
                        <Input
                          key={`${row.permission.slug}-${row.permission.nombre}`}
                          defaultValue={row.permission.nombre}
                          aria-label={row.permission.nombre}
                          onBlur={(event) =>
                            void renamePermission(row.permission, event.target.value)
                          }
                        />
                      ) : (
                        <strong className="text-sm font-semibold text-foreground">
                          {row.permission.nombre}
                        </strong>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {row.permission.slug}
                      </div>
                    </td>
                    {row.flags.map((on, index) => {
                      const role = roles[index];
                      if (!role) {
                        return null;
                      }
                      const locked = role.slug === ROL_BLOQUEADO;
                      return (
                        <td key={role.id} className="px-2 py-2 text-center">
                          {writable ? (
                            /*
                              La casilla mide 20px, muy por debajo del minimo tactil.
                              El <label> hace que toda la celda la active, asi el area
                              pulsable pasa a ser la celda entera sin engordar la
                              matriz, que es densa a proposito.
                            */
                            <label
                              className={cn(
                                'flex min-h-11 min-w-11 items-center justify-center rounded-md',
                                locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
                              )}
                              title={locked ? t('roles.lockedTitle') : undefined}
                            >
                              <input
                                type="checkbox"
                                className="h-5 w-5 accent-primary"
                                checked={on}
                                disabled={locked}
                                aria-label={t('roles.permissionForRole', {
                                  permission: row.permission.nombre,
                                  role: role.nombre,
                                })}
                                onChange={(event) =>
                                  void toggle(role, row.permission.slug, event.target.checked)
                                }
                              />
                            </label>
                          ) : on ? (
                            <span className="text-sm font-semibold text-success">
                              {t('roles.yes')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {writable ? (
        <form
          className="space-y-4 rounded-lg border border-border bg-card p-4"
          onSubmit={(event) => void onCreate(event)}
        >
          <h2 className="text-base font-bold text-foreground">{t('roles.newRole')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('roles.roleName')} htmlFor="role-nombre" required>
              <Input id="role-nombre" name="nombre" required minLength={2} />
            </FormField>
            <FormField label={t('roles.description')} htmlFor="role-desc">
              <Input id="role-desc" name="descripcion" />
            </FormField>
          </div>
          <Button type="submit">
            {t('roles.create')}
            <Icon name="plus" size={16} />
          </Button>
        </form>
      ) : null}

      <ConfirmDialog
        abierto={porConfirmar !== null}
        titulo={t('confirm.deleteRoleTitle', { name: porConfirmar?.nombre ?? '' })}
        descripcion={t('confirm.deleteRoleDescription')}
        ocupado={eliminando}
        onConfirmar={() => porConfirmar && void onDelete(porConfirmar)}
        onCancelar={() => setPorConfirmar(null)}
      />
    </section>
  );
}
