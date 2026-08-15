import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useOrg } from '../components/OrgGate';
import type { Permission, Role } from '../lib/api';
import { useApi } from '../lib/useApi';

export default function RolesPage() {
  const { orgId, can } = useOrg();
  const request = useApi();
  const writable = can('roles:write');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [roleRows, permissionRows] = await Promise.all([
      request<Role[]>('/api/v1/roles'),
      request<Permission[]>('/api/v1/permissions'),
    ]);
    setRoles(roleRows);
    setPermissions(permissionRows);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load() se redefine en cada render; orgId es el disparador real de la recarga.
  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    });
  }, [orgId]);

  const matrix = useMemo(() => {
    return permissions.map((permission) => ({
      permission,
      flags: roles.map((role) => role.permissions.some((item) => item.slug === permission.slug)),
    }));
  }, [permissions, roles]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function patchRole(roleId: string, body: { nombre?: string; descripcion?: string }) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo renombrar');
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
      setError(err instanceof Error ? err.message : 'No se pudo editar el permiso');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el rol');
    }
  }

  async function onDelete(role: Role) {
    if (!writable) {
      return;
    }
    setError(null);
    try {
      await request(`/api/v1/organizations/${orgId}/roles/${role.id}`, {
        method: 'DELETE',
      });
      setRoles((current) => current.filter((item) => item.id !== role.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  return (
    <section className="panel">
      <h1>Roles y permisos</h1>
      <p className="muted">
        La matriz es del sistema: un cambio aplica a todas las organizaciones. Cuando se agreguen
        módulos (donaciones, envíos) aparecerán filas nuevas.
        {saving ? ' Guardando…' : null}
      </p>
      {error ? <p className="error">{error}</p> : null}
      <div className="table-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th>Permiso</th>
              {roles.map((role) => (
                <th key={role.id}>
                  {writable ? (
                    <div className="role-head">
                      <input
                        key={`${role.id}-nombre`}
                        defaultValue={role.nombre}
                        aria-label={`Nombre de ${role.nombre}`}
                        onBlur={(event) => {
                          const nombre = event.target.value.trim();
                          if (nombre && nombre !== role.nombre) {
                            void patchRole(role.id, { nombre });
                          }
                        }}
                      />
                      <input
                        key={`${role.id}-desc`}
                        defaultValue={role.descripcion ?? ''}
                        placeholder="Descripción"
                        aria-label={`Descripción de ${role.nombre}`}
                        onBlur={(event) => {
                          const descripcion = event.target.value.trim();
                          if (descripcion !== (role.descripcion ?? '')) {
                            void patchRole(role.id, { descripcion });
                          }
                        }}
                      />
                      {role.slug !== 'administrador_acopio' ? (
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => void onDelete(role)}
                        >
                          Eliminar
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      {role.nombre}
                      {role.descripcion ? <div className="muted">{role.descripcion}</div> : null}
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.permission.slug}>
                <td>
                  {writable ? (
                    <input
                      key={`${row.permission.slug}-${row.permission.nombre}`}
                      className="permission-name"
                      defaultValue={row.permission.nombre}
                      onBlur={(event) => void renamePermission(row.permission, event.target.value)}
                    />
                  ) : (
                    <strong>{row.permission.nombre}</strong>
                  )}
                  <div className="muted">{row.permission.slug}</div>
                </td>
                {row.flags.map((on, index) => {
                  const role = roles[index];
                  if (!role) {
                    return null;
                  }
                  return (
                    <td key={role.id}>
                      {writable ? (
                        <input
                          type="checkbox"
                          checked={on}
                          aria-label={`${row.permission.nombre} para ${role.nombre}`}
                          onChange={(event) =>
                            void toggle(role, row.permission.slug, event.target.checked)
                          }
                        />
                      ) : on ? (
                        'Sí'
                      ) : (
                        '—'
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {writable ? (
        <form className="form" onSubmit={(event) => void onCreate(event)}>
          <h2>Nuevo rol</h2>
          <label className="field">
            Nombre
            <input name="nombre" required minLength={2} />
          </label>
          <label className="field">
            Descripción
            <input name="descripcion" />
          </label>
          <button className="button" type="submit">
            Crear rol
          </button>
        </form>
      ) : null}
    </section>
  );
}
