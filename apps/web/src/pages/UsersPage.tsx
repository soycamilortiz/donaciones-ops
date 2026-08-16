import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SkeletonList } from '../components/atoms/Skeleton';
import { ConfirmDialog } from '../components/molecules/ConfirmDialog';
import { useOrg } from '../components/OrgGate';
import type { Member, Role } from '../lib/api';
import { useApi } from '../lib/useApi';

export default function UsersPage() {
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const request = useApi();
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  // Id de la fila pendiente de confirmar; null = dialogo cerrado.
  const [porConfirmar, setPorConfirmar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function load() {
    const [memberRows, roleRows] = await Promise.all([
      request<Member[]>(`/api/v1/organizations/${orgId}/members`),
      request<Role[]>('/api/v1/roles'),
    ]);
    setMembers(memberRows);
    setRoles(roleRows);
    setCargando(false);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load() se redefine en cada render; orgId es el disparador real de la recarga.
  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    });
  }, [orgId]);

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await request(`/api/v1/organizations/${orgId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          correo: String(data.get('correo')),
          roleSlug: String(data.get('roleSlug') || 'voluntario'),
        }),
      });
      form.reset();
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

  async function onReactivate(member: Member) {
    setError(null);
    try {
      await request(`/api/v1/organizations/${orgId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          correo: member.correo,
          roleSlug: member.roleSlug,
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reactivar');
    }
  }

  async function onRemove(userId: string) {
    setError(null);
    setEliminando(true);
    try {
      await request(`/api/v1/organizations/${orgId}/members/${userId}`, {
        method: 'DELETE',
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.removeError'));
    } finally {
      setEliminando(false);
      setPorConfirmar(null);
    }
  }

  return (
    <section className="panel">
      <h1>{t('users.title')}</h1>
      {can('members:invite') ? (
        <form className="inline-form" onSubmit={(event) => void onInvite(event)}>
          {/*
            El placeholder desaparece al escribir: no sirve como etiqueta. Se usa
            `sr-only` para no alterar el formulario en linea, que es compacto a
            proposito, pero dejando el nombre disponible para lectores de pantalla.
          */}
          <label className="sr-only" htmlFor="invitar-correo">
            {t('users.inviteEmail')}
          </label>
          <input
            id="invitar-correo"
            name="correo"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="correo@org.org"
            required
          />
          <label className="sr-only" htmlFor="invitar-rol">
            {t('users.inviteRole')}
          </label>
          <select id="invitar-rol" name="roleSlug" defaultValue="voluntario">
            {roles
              .filter((role) => role.isActive !== false)
              .map((role) => (
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
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      {cargando ? <SkeletonList filas={4} etiqueta={t('common.loading')} /> : null}

      <table hidden={cargando}>
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
            <tr
              key={member.userId}
              className={member.isActive === false ? 'is-inactive' : undefined}
            >
              <td>
                {member.nombre}
                {member.isActive === false ? <div className="badge-baja">Baja</div> : null}
              </td>
              <td>{member.usuario}</td>
              <td>{member.correo}</td>
              <td>
                {can('members:role') && member.isActive !== false ? (
                  <select
                    value={member.roleSlug}
                    onChange={(event) => void onRole(member.userId, event.target.value)}
                  >
                    {roles
                      .filter((role) => role.isActive !== false)
                      .map((role) => (
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
                  member.isActive === false ? (
                    can('members:invite') ? (
                      <button
                        type="button"
                        className="linkish"
                        onClick={() => void onReactivate(member)}
                      >
                        Reactivar
                      </button>
                    ) : null
                  ) : (
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => setPorConfirmar(member.userId)}
                    >
                      {t('confirm.removeMemberAction')}
                    </button>
                  )
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ConfirmDialog
        abierto={porConfirmar !== null}
        titulo={t('confirm.removeMemberTitle')}
        descripcion={t('confirm.removeMemberDescription')}
        etiquetaConfirmar={t('confirm.removeMemberAction')}
        ocupado={eliminando}
        onConfirmar={() => porConfirmar && void onRemove(porConfirmar)}
        onCancelar={() => setPorConfirmar(null)}
      />
    </section>
  );
}
