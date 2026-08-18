import { AcopioFlujo } from '@soschoco/shared';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { SkeletonList } from '@/components/atoms/Skeleton';
import {
  AddressLocationPicker,
  type AddressLocationValue,
} from '@/components/molecules/AddressLocationPicker';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { FormField } from '@/components/molecules/FormField';
import { useToast } from '@/components/molecules/Toast';
import { useOrg } from '@/components/OrgGate';
import { DEFAULT_DEPARTAMENTO } from '@/features/geo/colombia';
import { ACOPIO_FLUJOS, type Acopio } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';
import { cn } from '@/lib/utils';

const textareaClassName =
  'flex min-h-[4.5rem] w-full rounded-md border border-border bg-card px-3.5 py-2.5 text-base md:text-sm text-foreground ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function addressFromAcopio(row: Acopio | null): AddressLocationValue {
  return {
    departamento: row?.departamento ?? (row ? '' : DEFAULT_DEPARTAMENTO),
    municipio: row?.municipio ?? '',
    direccion: row?.direccion ?? '',
    lat: row?.lat ?? null,
    lng: row?.lng ?? null,
  };
}

export default function AcopiosPage() {
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { avisar } = useToast();
  const request = useApi();
  const [rows, setRows] = useState<Acopio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  // Id de la fila pendiente de confirmar; null = dialogo cerrado.
  const [porConfirmar, setPorConfirmar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [editing, setEditing] = useState<Acopio | null>(null);
  const [address, setAddress] = useState<AddressLocationValue>(() => addressFromAcopio(null));
  const nombreRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      setRows(await request<Acopio[]>(`/api/v1/organizations/${orgId}/acopios`));
    } finally {
      // En `finally` para que un fallo no deje el esqueleto girando para siempre;
      // el error se muestra aparte.
      setCargando(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load() se redefine en cada render; orgId es el disparador real de la recarga.
  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : t('common.loadError'));
    });
  }, [orgId]);

  // UX-031: al tocar «Editar» el formulario ya está en pantalla pero puede
  // quedar fuera de vista (sobre todo en móvil, donde la lista está encima).
  // Lo trae a la vista y enfoca el primer campo para no tener que buscarlo.
  // biome-ignore lint/correctness/useExhaustiveDependencies: solo debe repetirse cuando cambia el registro en edición (por id), no en cada nueva referencia de `editing`.
  useEffect(() => {
    if (!editing) {
      return;
    }
    nombreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    nombreRef.current?.focus({ preventScroll: true });
  }, [editing?.id]);

  useEffect(() => {
    setAddress(addressFromAcopio(editing));
  }, [editing]);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      nombre: String(data.get('nombre') ?? '').trim(),
      flujo: String(data.get('flujo') ?? AcopioFlujo.Recibir),
      telefono: String(data.get('telefono') ?? '').trim() || undefined,
      descripcion: String(data.get('descripcion') ?? '').trim() || undefined,
      departamento: address.departamento.trim() || undefined,
      municipio: address.municipio.trim() || undefined,
      direccion: address.direccion.trim() || undefined,
      lat: address.lat ?? undefined,
      lng: address.lng ?? undefined,
    };
    try {
      if (editing) {
        await request(`/api/v1/organizations/${orgId}/acopios/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await request(`/api/v1/organizations/${orgId}/acopios`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setEditing(null);
      setAddress(addressFromAcopio(null));
      form.reset();
      await load();
      avisar(t('acopios.saved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('acopios.saveError'));
    }
  }

  async function onReactivate(id: string) {
    setError(null);
    try {
      await request(`/api/v1/organizations/${orgId}/acopios/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: true }),
      });
      await load();
      avisar(t('acopios.reactivated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('acopios.reactivateError'));
    }
  }

  async function onRemove(id: string) {
    setError(null);
    setEliminando(true);
    try {
      await request(`/api/v1/organizations/${orgId}/acopios/${id}`, {
        method: 'DELETE',
      });
      await load();
      avisar(t('acopios.deactivated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('acopios.deleteError'));
    } finally {
      setEliminando(false);
      setPorConfirmar(null);
    }
  }

  const activos = rows.filter((row) => row.isActive !== false).length;
  const inactivos = rows.length - activos;

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('acopios.title')}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('acopios.subtitle')}</p>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('acopios.listTitle')}
            </h2>
            {!cargando && rows.length > 0 ? (
              <span className="font-mono text-xs text-muted-foreground">
                {t('acopios.count', { active: activos, inactive: inactivos })}
              </span>
            ) : null}
          </div>

          {cargando ? <SkeletonList filas={3} etiqueta={t('common.loading')} /> : null}

          {!cargando && rows.length === 0 ? (
            <div className="space-y-3 rounded-lg border border-dashed border-border bg-card px-8 py-12 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-pill bg-secondary text-muted-foreground">
                <Icon name="home" size={28} />
              </span>
              <p className="text-lg font-semibold text-foreground">{t('acopios.emptyTitle')}</p>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">{t('acopios.empty')}</p>
              {can('acopios:write') ? (
                <Button
                  type="button"
                  onClick={() => {
                    document.getElementById('a-nombre')?.focus();
                    document
                      .getElementById('acopio-form')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  {t('acopios.newTitle')}
                  <Icon name="plus" size={16} />
                </Button>
              ) : null}
            </div>
          ) : null}

          {!cargando && rows.length > 0 ? (
            <ul className="space-y-3">
              {rows.map((row) => {
                const inactive = row.isActive === false;
                const meta = [row.municipio, row.departamento, row.direccion, row.telefono]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li
                    key={row.id}
                    className={cn(
                      'flex flex-wrap items-center gap-4 rounded-lg border p-4',
                      inactive
                        ? 'border-dashed border-border bg-secondary'
                        : 'border-border bg-card',
                    )}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-secondary text-primary">
                      <Icon name="home" size={18} />
                    </span>
                    <div className="min-w-[180px] flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="font-semibold text-foreground">{row.nombre}</strong>
                        {inactive ? <Badge>{t('acopios.inactive')}</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {ACOPIO_FLUJOS.find((item) => item.value === row.flujo)?.label}
                        </span>
                        {' · '}
                        {meta || t('acopios.noLocation')}
                      </p>
                    </div>
                    {can('inventory:read') || can('acopios:write') ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {can('inventory:read') ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(ROUTES.ubicacionesDe(row.id))}
                          >
                            {t('acopios.configureLocations')}
                          </Button>
                        ) : null}
                        {can('acopios:write') ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditing(row)}
                            >
                              {t('common.edit')}
                            </Button>
                            {inactive ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void onReactivate(row.id)}
                              >
                                {t('acopios.reactivate')}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setPorConfirmar(row.id)}
                              >
                                {t('acopios.deactivate')}
                              </Button>
                            )}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        {can('acopios:write') ? (
          <form
            id="acopio-form"
            className="space-y-4 rounded-lg border border-border bg-card p-5"
            key={editing?.id ?? 'new'}
            onSubmit={(event) => void onSave(event)}
          >
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              {editing ? t('acopios.editTitle') : t('acopios.newTitle')}
            </h2>

            <FormField label={t('acopios.fields.name')} htmlFor="a-nombre" required>
              <Input
                ref={nombreRef}
                id="a-nombre"
                name="nombre"
                required
                placeholder={t('acopios.fields.namePlaceholder')}
                defaultValue={editing?.nombre ?? ''}
              />
            </FormField>

            <FormField label={t('acopios.fields.flow')} htmlFor="a-flujo">
              <Select
                id="a-flujo"
                name="flujo"
                defaultValue={editing?.flujo ?? AcopioFlujo.Recibir}
              >
                {ACOPIO_FLUJOS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <AddressLocationPicker value={address} onChange={setAddress} mapPosition="above" />

            <FormField label={t('acopios.fields.phone')} htmlFor="a-tel">
              <Input
                id="a-tel"
                name="telefono"
                type="tel"
                autoComplete="tel"
                placeholder={t('acopios.fields.phonePlaceholder')}
                defaultValue={editing?.telefono ?? ''}
              />
            </FormField>

            <FormField label={t('acopios.fields.description')} htmlFor="a-desc">
              <textarea
                id="a-desc"
                name="descripcion"
                rows={2}
                placeholder={t('acopios.fields.descriptionPlaceholder')}
                defaultValue={editing?.descripcion ?? ''}
                className={textareaClassName}
              />
            </FormField>

            <Button type="submit" className="w-full">
              {t('common.save')}
            </Button>
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setEditing(null)}
              >
                {t('common.cancel')}
              </Button>
            ) : null}
          </form>
        ) : null}
      </div>

      <ConfirmDialog
        abierto={porConfirmar !== null}
        titulo={t('confirm.deleteAcopioTitle')}
        descripcion={t('confirm.deleteAcopioDescription')}
        ocupado={eliminando}
        onConfirmar={() => porConfirmar && void onRemove(porConfirmar)}
        onCancelar={() => setPorConfirmar(null)}
      />
    </div>
  );
}
