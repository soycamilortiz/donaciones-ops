import type { DonacionImagen } from '@soschoco/shared';
import { DonacionImagenEstado } from '@soschoco/shared';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, type BadgeVariant } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { StatCard } from '@/components/molecules/StatCard';
import { useOrg } from '@/components/OrgGate';
import { DataTable, type DataTableColumn } from '@/components/organisms/DataTable';
import { listarImagenes } from '@/features/donaciones/donaciones-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

const ESTADO: Record<string, { label: string; variant: BadgeVariant }> = {
  [DonacionImagenEstado.Pendiente]: { label: 'En cola', variant: 'secondary' },
  [DonacionImagenEstado.Procesando]: { label: 'Procesando', variant: 'info' },
  [DonacionImagenEstado.Procesada]: { label: 'Procesada', variant: 'success' },
  [DonacionImagenEstado.Fallida]: { label: 'Fallida', variant: 'error' },
};

type Fila = DonacionImagen & Record<string, unknown>;

export default function DonacionesPage() {
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();

  const [imagenes, setImagenes] = useState<Fila[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const pagina = await listarImagenes(request, orgId);
      setImagenes(pagina.items as Fila[]);
      setCursor(pagina.siguienteCursor);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las donaciones');
    } finally {
      setCargando(false);
    }
  }, [request, orgId]);

  const cargarMas = useCallback(async () => {
    if (!cursor) {
      return;
    }
    setCargandoMas(true);
    try {
      const pagina = await listarImagenes(request, orgId, { cursor });
      setImagenes((previas) => [...previas, ...(pagina.items as Fila[])]);
      setCursor(pagina.siguienteCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar más donaciones');
    } finally {
      setCargandoMas(false);
    }
  }, [request, orgId, cursor]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Si hay algo en cola, refresca solo: el worker termina en segundos.
  useEffect(() => {
    const enCurso = imagenes.some(
      (fila) =>
        fila.estado === DonacionImagenEstado.Pendiente ||
        fila.estado === DonacionImagenEstado.Procesando,
    );
    if (!enCurso) {
      return;
    }
    const id = setTimeout(() => void cargar(), 4000);
    return () => clearTimeout(id);
  }, [imagenes, cargar]);

  const columns: DataTableColumn<Fila>[] = [
    {
      key: 'blobUrl',
      header: 'Foto',
      render: (fila) => (
        <img
          src={fila.blobUrl}
          alt="Producto donado"
          loading="lazy"
          className="h-12 w-12 rounded object-cover"
        />
      ),
    },
    {
      key: 'producto',
      header: 'Producto',
      render: (fila) =>
        fila.producto ? (
          <span className="font-medium">{fila.producto.nombre}</span>
        ) : (
          <span className="text-muted-foreground">Sin identificar</span>
        ),
    },
    {
      key: 'acopio',
      header: 'Acopio',
      render: (fila) =>
        fila.acopio ? (
          fila.acopio.nombre
        ) : (
          <span className="text-muted-foreground">Sin especificar</span>
        ),
    },
    {
      key: 'confianza',
      header: 'Certeza',
      align: 'right',
      render: (fila) =>
        typeof fila.confianza === 'number' ? `${Math.round(fila.confianza * 100)}%` : '—',
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (fila) => (
        <Badge variant={ESTADO[fila.estado]?.variant ?? 'default'}>
          {ESTADO[fila.estado]?.label ?? fila.estado}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      align: 'right',
      render: (fila) => new Date(fila.createdAt).toLocaleDateString('es-CO'),
    },
  ];

  const procesadas = imagenes.filter((f) => f.estado === DonacionImagenEstado.Procesada);
  const porRevisar = procesadas.filter((f) => !f.producto).length;
  const fallidas = imagenes.filter((f) => f.estado === DonacionImagenEstado.Fallida).length;
  const enCola = imagenes.length - procesadas.length - fallidas;

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Donaciones</h1>
          <p className="text-sm text-muted-foreground">
            Productos donados, reconocidos a partir de la foto.
          </p>
        </div>
        {can('donaciones:write') ? (
          <Button onClick={() => navigate(ROUTES.nuevaDonacion)}>Registrar producto</Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Fotos registradas" value={String(imagenes.length)} icon="heart" />
        <StatCard label="Reconocidas" value={String(procesadas.length - porRevisar)} icon="check" />
        <StatCard label="Por revisar" value={String(porRevisar)} icon="info" />
        <StatCard label="En cola" value={String(Math.max(enCola, 0))} icon="settings" />
      </div>

      {porRevisar > 0 && can('donaciones:write') ? (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
          <p className="text-sm text-foreground">
            Hay {porRevisar} {porRevisar === 1 ? 'foto' : 'fotos'} sin producto identificado.
          </p>
          <Button variant="outline" onClick={() => navigate(ROUTES.revisionDonaciones)}>
            Revisar
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Cargando…
        </p>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={imagenes}
            caption="Fotos de productos donados"
            emptyMessage="Todavía no se ha registrado ninguna foto. Usá «Registrar producto» para tomar la primera."
          />
          {cursor ? (
            <div className="flex justify-center">
              <Button variant="outline" disabled={cargandoMas} onClick={() => void cargarMas()}>
                {cargandoMas ? 'Cargando…' : 'Cargar más'}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
