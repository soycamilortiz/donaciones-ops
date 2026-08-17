import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { cn } from '@/lib/utils';
import type { Me } from '../lib/api';

type OutletCtx = { me: Me; refresh: () => Promise<void> };
type ReloadStatus = 'idle' | 'loading' | 'error';

export default function WaitingRoom() {
  const { t } = useTranslation();
  const { me, refresh } = useOutletContext<OutletCtx>();
  const [status, setStatus] = useState<ReloadStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function onReload() {
    setStatus('loading');
    setMessage(null);
    try {
      await refresh();
      // Still mounted here means GET /me came back without a membership: if it
      // had found one, OrgGate would already have navigated away from /pendiente.
      setStatus('idle');
      setMessage(t('waitingRoom.stillWaiting'));
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : t('waitingRoom.reloadError'));
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-6 px-6 py-10">
      <div className="flex h-[168px] items-center justify-center rounded-xl bg-primary">
        <svg
          width={220}
          height={108}
          viewBox="0 0 342 168"
          fill="none"
          aria-hidden="true"
          className="max-w-full"
        >
          <circle
            cx={171}
            cy={84}
            r={76}
            stroke="var(--color-primary-foreground)"
            strokeOpacity={0.12}
            strokeWidth={1.5}
          />
          <circle
            cx={171}
            cy={84}
            r={58}
            stroke="var(--color-primary-foreground)"
            strokeOpacity={0.18}
            strokeWidth={1.5}
          />
          <circle
            cx={171}
            cy={84}
            r={40}
            stroke="var(--color-primary-foreground)"
            strokeOpacity={0.25}
            strokeWidth={1.5}
          />
          <circle cx={171} cy={84} r={22} fill="var(--color-primary-panel)" />
          <path
            d="M162 79h18a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-18a1.5 1.5 0 0 1-1.5-1.5v-9a1.5 1.5 0 0 1 1.5-1.5z"
            stroke="var(--color-accent)"
            strokeWidth={1.8}
          />
          <polyline
            points="160.5,80 171,87.5 181.5,80"
            stroke="var(--color-accent)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      <div className="space-y-2 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t('waitingRoom.eyebrow')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          {t('onboarding.waitingTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('waitingRoom.subtitle', { correo: me.correo })}
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3.5">
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 text-primary"
        >
          <rect x={3} y={5} width={18} height={14} rx={2} />
          <path d="m3 7 9 6 9-6" />
        </svg>
        <span className="text-sm font-bold tracking-tight text-foreground">{me.correo}</span>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          size="lg"
          className="w-full"
          isLoading={status === 'loading'}
          onClick={() => void onReload()}
        >
          {t('waitingRoom.reload')}
          {status !== 'loading' ? (
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-2.6-6.4" />
              <path d="M21 3v6h-6" />
            </svg>
          ) : null}
        </Button>
        <Link
          to="/empezar/organizacion"
          className="text-center text-sm font-semibold text-primary underline underline-offset-4"
        >
          {t('onboarding.preferCreate')}
        </Link>
      </div>

      {message ? (
        <p
          role={status === 'error' ? 'alert' : 'status'}
          className={cn(
            'rounded-md px-4 py-3 text-sm font-medium',
            status === 'error' ? 'bg-error-soft text-error' : 'bg-info-soft text-info',
          )}
        >
          {message}
        </p>
      ) : null}

      <div className="flex items-start gap-3 rounded-md border border-border bg-secondary p-4">
        <Icon name="info" size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{t('waitingRoom.note')}</p>
      </div>
    </section>
  );
}
