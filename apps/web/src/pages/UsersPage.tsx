import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/atoms/Avatar';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { SkeletonList } from '@/components/atoms/Skeleton';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { FormField } from '@/components/molecules/FormField';
import { useOrg } from '@/components/OrgGate';
import type { Member, Role } from '@/lib/api';
import { useApi } from '@/lib/useApi';

/** First letter of up to two words, for the round avatar fallback. */
function initials(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

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
      setError(err instanceof Error ? err.message : t('common.loadError'));
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
      setError(err instanceof Error ? err.message : t('users.addError'));
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
      setError(err instanceof Error ? err.message : t('users.roleError'));
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
      setError(err instanceof Error ? err.message : t('users.reactivateError'));
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

  const activeRoles = roles.filter((role) => role.isActive !== false);

  function roleField(member: Member, className?: string) {
    if (can('members:role') && member.isActive !== false) {
      return (
        <Select
          className={className}
          value={member.roleSlug}
          aria-label={`${t('users.columns.role')}: ${member.nombre}`}
          onChange={(event) => void onRole(member.userId, event.target.value)}
        >
          {activeRoles.map((role) => (
            <option key={role.slug} value={role.slug}>
              {role.nombre}
            </option>
          ))}
        </Select>
      );
    }
    return <span className="text-sm text-foreground">{member.roleNombre}</span>;
  }

  function actionField(member: Member, className?: string) {
    if (!can('members:remove')) {
      return null;
    }
    if (member.isActive === false) {
      if (!can('members:invite')) {
        return null;
      }
      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          onClick={() => void onReactivate(member)}
        >
          {t('users.reactivate')}
        </Button>
      );
    }
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setPorConfirmar(member.userId)}
      >
        {t('confirm.removeMemberAction')}
      </Button>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('users.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('users.subtitle')}</p>
      </div>

      {can('members:invite') ? (
        <form
          className="space-y-3 rounded-lg border border-border bg-card p-5"
          onSubmit={(event) => void onInvite(event)}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <FormField
              label={t('users.inviteEmail')}
              htmlFor="invitar-correo"
              required
              hint={t('users.inviteHint')}
              className="flex-1 sm:min-w-[240px]"
            >
              <Input
                id="invitar-correo"
                name="correo"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="correo@org.org"
                required
              />
            </FormField>
            <FormField label={t('users.inviteRole')} htmlFor="invitar-rol" className="sm:w-56">
              <Select id="invitar-rol" name="roleSlug" defaultValue="voluntario">
                {activeRoles.map((role) => (
                  <option key={role.slug} value={role.slug}>
                    {role.nombre}
                  </option>
                ))}
              </Select>
            </FormField>
            <Button type="submit">
              {t('users.add')}
              <Icon name="plus" size={18} />
            </Button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <SkeletonList filas={4} etiqueta={t('common.loading')} />
      ) : members.length === 0 ? (
        <p className="rounded-lg border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          {t('common.empty')}
        </p>
      ) : (
        <>
          {/* UX-014 · <600px (~sm): una tarjeta por persona, controles a lo ancho. */}
          <ul className="space-y-3 sm:hidden">
            {members.map((member) => (
              <li
                key={member.userId}
                className="space-y-3 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    size="sm"
                    alt={member.nombre}
                    fallback={initials(member.nombre)}
                    className={member.isActive === false ? 'opacity-50' : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{member.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.correo}</p>
                  </div>
                  {member.isActive === false ? (
                    <Badge variant="error">{t('users.inactiveBadge')}</Badge>
                  ) : null}
                </div>

                <p className="text-xs text-muted-foreground">
                  <span className="font-bold uppercase tracking-wide">
                    {t('users.columns.username')}:
                  </span>{' '}
                  {member.usuario}
                </p>

                <div className="space-y-1.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t('users.columns.role')}
                  </span>
                  {roleField(member)}
                </div>

                {actionField(member, 'w-full')}
              </li>
            ))}
          </ul>

          {/* UX-014 · >=600px (sm): tabla completa, sin scroll de página. */}
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card sm:block">
            <table className="w-full caption-bottom text-sm">
              <thead className="border-b border-border bg-secondary">
                <tr>
                  <th
                    scope="col"
                    className="h-11 px-4 text-left align-middle text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {t('users.columns.name')}
                  </th>
                  <th
                    scope="col"
                    className="h-11 px-4 text-left align-middle text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {t('users.columns.username')}
                  </th>
                  <th
                    scope="col"
                    className="h-11 px-4 text-left align-middle text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {t('users.columns.email')}
                  </th>
                  <th
                    scope="col"
                    className="h-11 px-4 text-left align-middle text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {t('users.columns.role')}
                  </th>
                  <th
                    scope="col"
                    className="h-11 px-4 text-right align-middle text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {t('users.columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.userId}
                    className="border-b border-border transition-colors last:border-0 hover:bg-secondary/50"
                  >
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <Avatar
                          size="sm"
                          alt={member.nombre}
                          fallback={initials(member.nombre)}
                          className={member.isActive === false ? 'opacity-50' : undefined}
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-foreground">{member.nombre}</span>
                          {member.isActive === false ? (
                            <Badge variant="error">{t('users.inactiveBadge')}</Badge>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle text-foreground">{member.usuario}</td>
                    <td className="px-4 py-3.5 align-middle text-foreground">{member.correo}</td>
                    <td className="px-4 py-3.5 align-middle">{roleField(member, 'sm:w-48')}</td>
                    <td className="px-4 py-3.5 text-right align-middle">{actionField(member)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmDialog
        abierto={porConfirmar !== null}
        titulo={t('confirm.removeMemberTitle')}
        descripcion={t('confirm.removeMemberDescription')}
        etiquetaConfirmar={t('confirm.removeMemberAction')}
        ocupado={eliminando}
        onConfirmar={() => porConfirmar && void onRemove(porConfirmar)}
        onCancelar={() => setPorConfirmar(null)}
      />
    </div>
  );
}
