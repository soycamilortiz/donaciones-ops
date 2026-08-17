import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { Input } from '@/components/atoms/Input';
import { FormField } from '@/components/molecules/FormField';
import { AuthLayout } from '@/components/templates/AuthLayout';
import { type Me, ORGANIZATION_TIPOS, storeOrgId } from '../lib/api';
import { useApi } from '../lib/useApi';

type OutletCtx = { me: Me; refresh: () => Promise<void> };

// Skin html-base: mismo tratamiento visual que el atomo Input (radio, borde,
// alto tactil de 44px, foco con anillo verde), pero sin `appearance-none`
// para conservar la flecha nativa del <select> (igual que LanguageSwitcher).
const selectClass =
  'flex h-11 w-full cursor-pointer items-center rounded-md border border-border bg-card px-3.5 py-2 text-base md:text-sm text-foreground ring-offset-background transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const textareaClass =
  'flex w-full resize-y rounded-md border border-border bg-card px-3.5 py-2.5 text-base md:text-sm text-foreground ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function Onboarding() {
  const { t } = useTranslation();
  const { me, refresh } = useOutletContext<OutletCtx>();
  const request = useApi();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState('CENTRO_ACOPIO');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const payload = {
      nombre: String(data.get('nombre') ?? '').trim(),
      correo: String(data.get('correo') ?? '').trim(),
      telefono: String(data.get('telefono') ?? '').trim() || undefined,
      descripcion: String(data.get('descripcion') ?? '').trim() || undefined,
      tipo,
      tipoDetalle: String(data.get('tipoDetalle') ?? '').trim() || undefined,
    };

    try {
      const org = await request<{ id: string }>('/api/v1/organizations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      storeOrgId(org.id);
      await refresh();
      navigate('/app/acopios');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('onboarding.createError'));
    }
  }

  return (
    <AuthLayout>
      {/* Volver arriba del titulo, dentro de la misma tarjeta: AuthLayout no
          expone una ranura anterior al titulo, asi que title/subtitle se
          arman a mano aca para intercalar el link, igual que en el html-base. */}
      <Link
        to="/empezar"
        className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-[11px] font-bold uppercase leading-none tracking-wide text-primary"
      >
        <Icon name="chevron-right" size={13} className="rotate-180" aria-hidden />
        {t('onboarding.back')}
      </Link>
      <h1 className="text-center text-3xl font-semibold tracking-tight text-primary">
        {t('onboarding.createOrg')}
      </h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        {t('onboarding.createOrgLede')}
      </p>
      <form className="mt-6 space-y-5" onSubmit={(event) => void onSubmit(event)}>
        <FormField label={t('onboarding.name')} htmlFor="nombre" required>
          <Input
            id="nombre"
            name="nombre"
            required
            aria-required="true"
            minLength={2}
            autoComplete="organization"
          />
        </FormField>
        <FormField label={t('onboarding.email')} htmlFor="correo" required>
          <Input
            id="correo"
            name="correo"
            type="email"
            required
            aria-required="true"
            defaultValue={me.correo}
            autoComplete="email"
          />
        </FormField>
        <FormField label={t('onboarding.type')} htmlFor="tipo">
          <select
            id="tipo"
            name="tipo"
            className={selectClass}
            value={tipo}
            onChange={(event) => setTipo(event.target.value)}
          >
            {ORGANIZATION_TIPOS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </FormField>
        {tipo === 'OTRO' ? (
          <div className="flex flex-col gap-1.5 rounded-md bg-accent-soft p-3.5">
            <p className="text-[11px] font-bold text-accent-foreground">
              {t('onboarding.typeDetailNote')}
            </p>
            <FormField label={t('onboarding.typeDetail')} htmlFor="tipoDetalle">
              <Input
                id="tipoDetalle"
                name="tipoDetalle"
                placeholder={t('onboarding.typeDetailPlaceholder')}
              />
            </FormField>
          </div>
        ) : null}
        <FormField label={t('onboarding.phone')} htmlFor="telefono">
          <Input
            id="telefono"
            name="telefono"
            type="tel"
            inputMode="tel"
            placeholder={t('onboarding.phonePlaceholder')}
            autoComplete="tel"
          />
        </FormField>
        <FormField label={t('onboarding.description')} htmlFor="descripcion">
          <textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            placeholder={t('onboarding.descriptionPlaceholder')}
            className={textareaClass}
          />
        </FormField>
        {error ? (
          <p role="alert" className="text-sm font-medium text-error">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full">
          {t('onboarding.createOrg')}
        </Button>
      </form>
    </AuthLayout>
  );
}
