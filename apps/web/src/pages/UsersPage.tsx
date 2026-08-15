import { type FormEvent, useEffect, useState } from 'react';
import { useOrg } from '../components/OrgGate';
import { useApi } from '../lib/useApi';
import type { Member, Role } from '../lib/api';

export default function UsersPage() {
  const { orgId, can } = useOrg();
  const request = useApi();
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [memberRows, roleRows] = await Promise.all([
      request<Member[]>(`/api/v1/organizations/${orgId}/members`),
      request<Role[]>('/api/v1/roles'),
    ]);
    setMembers(memberRows);
    setRoles(roleRows);
  }

  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    });
  }, [orgId]);

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      await request(`/api/v1/organizations/${orgId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          correo: String(data.get('correo')),
          roleSlug: String(data.get('roleSlug') || 'voluntario'),
        }),
      });
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar');
    }
  }

  async function onRole(userId: string, roleSlug: string) {
    setError(null);
    try {
      await request(`/api/v1/organizations/${orgId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ roleSlug }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el rol');
    }
  }

  async function onRemove(userId: string) {
    setError(null);
    try {
      await request(`/api/v1/organizations/${orgId}/members/${userId}`, {
        method: 'DELETE',
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar');
    }
  }

  return (
    <section className="panel">
      <h1>Usuarios</h1>
      {can('members:invite') ? (
        <form className="inline-form" onSubmit={(event) => void onInvite(event)}>
          <input name="correo" type="email" placeholder="correo@org.org" required />
          <select name="roleSlug" defaultValue="voluntario">
            {roles.map((role) => (
              <option key={role.slug} value={role.slug}>
                {role.nombre}
              </option>
            ))}
          </select>
          <button className="button" type="submit">
            Agregar
          </button>
        </form>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Correo</th>
            <th>Rol</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.userId}>
              <td>{member.nombre}</td>
              <td>{member.usuario}</td>
              <td>{member.correo}</td>
              <td>
                {can('members:role') ? (
                  <select
                    value={member.roleSlug}
                    onChange={(event) =>
                      void onRole(member.userId, event.target.value)
                    }
                  >
                    {roles.map((role) => (
                      <option key={role.slug} value={role.slug}>
                        {role.nombre}
                      </option>
                    ))}
                  </select>
                ) : (
                  member.roleNombre
                )}
              </td>
              <td>
                {can('members:remove') ? (
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => void onRemove(member.userId)}
                  >
                    Quitar
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
