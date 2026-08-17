import { AcopioFlujo } from '@soschoco/shared';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { Input } from '@/components/atoms/Input';
import { SkeletonList } from '@/components/atoms/Skeleton';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { FormField } from '@/components/molecules/FormField';
import { useOrg } from '@/components/OrgGate';
import { ACOPIO_FLUJOS, type Acopio } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { cn } from '@/lib/utils';

// Estilo compartido: no hay atomo Select/Textarea en el DS, asi que se calcan
// las clases base de Input para que ambos campos midan y se vean igual.
const selectClassName =
  'flex h-11 w-full cursor-pointer appearance-none rounded-md border border-border bg-card px-3.5 py-2 text-base md:text-sm text-foreground ring-offset-background transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
const textareaClassName =
  'flex min-h-[4.5rem] w-full rounded-md border border-border bg-card px-3.5 py-2.5 text-base md:text-sm text-foreground ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function AcopiosPage() {
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const request = useApi();
  const [rows, setRows] = useState<Acopio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  // Id de la fila pendiente de confirmar; null = dialogo cerrado.
  const [porConfirmar, setPorConfirmar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [editing, setEditing] = useState<Acopio | null>(null);
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
      setError(err instanceof Error ? err.message : 'Error al cargar');
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

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const latRaw = String(data.get('lat') ?? '').trim();
    const lngRaw = String(data.get('lng') ?? '').trim();
    const payload = {
      nombre: String(data.get('nombre') ?? '').trim(),
      flujo: String(data.get('flujo') ?? AcopioFlujo.Recibir),
      telefono: String(data.get('telefono') ?? '').trim() || undefined,
      descripcion: String(data.get('descripcion') ?? '').trim() || undefined,
      municipio: String(data.get('municipio') ?? '').trim() || undefined,
      direccion: String(data.get('direccion') ?? '').trim() || undefined,
      lat: latRaw ? Number(latRaw) : undefined,
      lng: lngRaw ? Number(lngRaw) : undefined,
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
      form.reset();
      await load();
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
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
            </div>
          ) : null}

          {!cargando && rows.length > 0 ? (
            <ul className="space-y-3">
              {rows.map((row) => {
                const inactive = row.isActive === false;
                const meta = [row.municipio, row.direccion, row.telefono]
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
                    {can('acopios:write') ? (
                      <div className="flex flex-wrap items-center gap-2">
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
              <select
                id="a-flujo"
                name="flujo"
                className={selectClassName}
                defaultValue={editing?.flujo ?? AcopioFlujo.Recibir}
              >
                {ACOPIO_FLUJOS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t('acopios.fields.municipality')} htmlFor="a-mun">
              <Input
                id="a-mun"
                name="municipio"
                placeholder={t('acopios.fields.municipalityPlaceholder')}
                defaultValue={editing?.municipio ?? ''}
              />
            </FormField>

            <FormField label={t('acopios.fields.address')} htmlFor="a-dir">
              <Input
                id="a-dir"
                name="direccion"
                placeholder={t('acopios.fields.addressPlaceholder')}
                defaultValue={editing?.direccion ?? ''}
              />
            </FormField>

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

            <div className="grid grid-cols-2 gap-3">
              <FormField label={t('acopios.fields.lat')} htmlFor="a-lat">
                <Input
                  id="a-lat"
                  name="lat"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  defaultValue={editing?.lat ?? ''}
                />
              </FormField>
              <FormField label={t('acopios.fields.lng')} htmlFor="a-lng">
                <Input
                  id="a-lng"
                  name="lng"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  defaultValue={editing?.lng ?? ''}
                />
              </FormField>
            </div>

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
