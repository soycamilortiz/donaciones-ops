import type { Kit } from '@soschoco/shared';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { FormField } from '@/components/molecules/FormField';
import { useOrg } from '@/components/OrgGate';
import {
  agregarComponenteKit,
  crearKit,
  darBajaKit,
  listarCatalogoProductos,
  listarKits,
  quitarComponenteKit,
} from '@/features/reservas/reservas-service';
import { useApi } from '@/lib/useApi';

const selectClass =
  'flex h-11 w-full cursor-pointer appearance-none rounded-md border border-border bg-card px-3.5 py-2 text-base md:text-sm text-foreground ring-offset-background transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function KitsPage() {
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const writable = can('inventory:write');
  const [kits, setKits] = useState<Kit[]>([]);
  const [productos, setProductos] = useState<Array<{ id: string; nombre: string; sku: string }>>(
    [],
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [altoM, setAltoM] = useState('');
  const [esCritico, setEsCritico] = useState(false);
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [borrador, setBorrador] = useState<Array<{ productoId: string; cantidad: number }>>([]);
  const [guardando, setGuardando] = useState(false);
  const [bajaId, setBajaId] = useState<string | null>(null);
  const [addKitId, setAddKitId] = useState<string | null>(null);
  const [addProductoId, setAddProductoId] = useState('');
  const [addCantidad, setAddCantidad] = useState('1');

  const cargar = useCallback(async () => {
    try {
      const [rows, catalogo] = await Promise.all([
        listarKits(request, orgId),
        listarCatalogoProductos(request, orgId),
      ]);
      setKits(rows);
      setProductos(catalogo);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('kits.loadError'));
    } finally {
      setCargando(false);
    }
  }, [request, orgId, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const nombreProducto = (id: string) =>
    productos.find((row) => row.id === id)?.nombre ??
    kits.flatMap((kit) => kit.componentes).find((comp) => comp.productoId === id)?.productoNombre ??
    id;

  const agregarBorrador = () => {
    const qty = Number(cantidad);
    if (!productoId || !(qty > 0)) {
      return;
    }
    setBorrador((prev) => [
      ...prev.filter((row) => row.productoId !== productoId),
      { productoId, cantidad: qty },
    ]);
    setProductoId('');
    setCantidad('1');
  };

  const crear = async (event: FormEvent) => {
    event.preventDefault();
    if (!writable || !nombre.trim()) {
      return;
    }
    setGuardando(true);
    try {
      await crearKit(request, orgId, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        pesoKgEstimado: pesoKg ? Number(pesoKg) : undefined,
        altoMEstimado: altoM ? Number(altoM) : undefined,
        esCritico,
        componentes: borrador,
      });
      setNombre('');
      setDescripcion('');
      setPesoKg('');
      setAltoM('');
      setEsCritico(false);
      setBorrador([]);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('kits.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  const agregarAKit = async (kitId: string) => {
    const qty = Number(addCantidad);
    if (!addProductoId || !(qty > 0)) {
      return;
    }
    try {
      await agregarComponenteKit(request, orgId, kitId, addProductoId, qty);
      setAddKitId(null);
      setAddProductoId('');
      setAddCantidad('1');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('kits.saveError'));
    }
  };

  if (!can('inventory:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('kits.noPermission')}</p>;
  }

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('kits.title')}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('kits.subtitle')}</p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {writable ? (
        <form onSubmit={crear} className="space-y-4 rounded-lg border border-border bg-card p-4">
          <h2 className="text-base font-semibold text-foreground">{t('kits.newTitle')}</h2>
          <FormField label={t('kits.fields.name')} htmlFor="kit-nombre" required>
            <Input
              id="kit-nombre"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              required
            />
          </FormField>
          <FormField label={t('kits.fields.description')} htmlFor="kit-desc">
            <Input
              id="kit-desc"
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t('kits.fields.weight')} htmlFor="kit-peso">
              <Input
                id="kit-peso"
                type="number"
                min="0"
                step="any"
                value={pesoKg}
                onChange={(event) => setPesoKg(event.target.value)}
              />
            </FormField>
            <FormField label={t('kits.fields.height')} htmlFor="kit-alto">
              <Input
                id="kit-alto"
                type="number"
                min="0"
                step="any"
                value={altoM}
                onChange={(event) => setAltoM(event.target.value)}
              />
            </FormField>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={esCritico}
              onChange={(event) => setEsCritico(event.target.checked)}
            />
            {t('kits.fields.critical')}
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
            <FormField label={t('kits.fields.product')} htmlFor="kit-prod">
              <select
                id="kit-prod"
                className={selectClass}
                value={productoId}
                onChange={(event) => setProductoId(event.target.value)}
              >
                <option value="">{t('kits.fields.productPlaceholder')}</option>
                {productos.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.nombre}
                    {row.sku ? ` · ${row.sku}` : ''}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t('kits.fields.qty')} htmlFor="kit-qty">
              <Input
                id="kit-qty"
                type="number"
                min="0.001"
                step="any"
                value={cantidad}
                onChange={(event) => setCantidad(event.target.value)}
              />
            </FormField>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={agregarBorrador}>
                {t('kits.addComponent')}
              </Button>
            </div>
          </div>
          {borrador.length > 0 ? (
            <ul className="space-y-1 text-sm text-foreground">
              {borrador.map((row) => (
                <li key={row.productoId} className="flex items-center justify-between gap-2">
                  <span>
                    {nombreProducto(row.productoId)} · {row.cantidad}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setBorrador((prev) =>
                        prev.filter((item) => item.productoId !== row.productoId),
                      )
                    }
                  >
                    {t('common.delete')}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('kits.bomHint')}</p>
          )}
          <Button type="submit" disabled={guardando || !nombre.trim()}>
            {guardando ? t('common.saving') : t('kits.create')}
          </Button>
        </form>
      ) : null}

      {cargando ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> {t('common.loading')}
        </p>
      ) : kits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('kits.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {kits.map((kit) => (
            <li key={kit.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {kit.codigo}
                  </p>
                  <h2 className="text-lg font-semibold text-foreground">{kit.nombre}</h2>
                  {kit.descripcion ? (
                    <p className="text-sm text-muted-foreground">{kit.descripcion}</p>
                  ) : null}
                </div>
                {writable ? (
                  <Button type="button" variant="outline" onClick={() => setBajaId(kit.id)}>
                    {t('common.delete')}
                  </Button>
                ) : null}
              </div>
              {kit.componentes.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('kits.noBom')}</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {kit.componentes.map((comp) => (
                    <li key={comp.id} className="flex items-center justify-between gap-2">
                      <span>
                        {comp.productoNombre ?? nombreProducto(comp.productoId)}
                        {comp.productoSku ? ` · ${comp.productoSku}` : ''} · {comp.cantidad}
                      </span>
                      {writable ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            void quitarComponenteKit(request, orgId, kit.id, comp.id)
                              .then(cargar)
                              .catch((err) =>
                                setError(err instanceof Error ? err.message : t('kits.saveError')),
                              )
                          }
                        >
                          {t('common.delete')}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {writable ? (
                addKitId === kit.id ? (
                  <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto_auto]">
                    <select
                      className={selectClass}
                      value={addProductoId}
                      onChange={(event) => setAddProductoId(event.target.value)}
                    >
                      <option value="">{t('kits.fields.productPlaceholder')}</option>
                      {productos.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.nombre}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min="0.001"
                      step="any"
                      value={addCantidad}
                      onChange={(event) => setAddCantidad(event.target.value)}
                    />
                    <Button type="button" onClick={() => void agregarAKit(kit.id)}>
                      {t('common.save')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setAddKitId(null)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setAddKitId(kit.id)}>
                    {t('kits.addComponent')}
                  </Button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        abierto={bajaId !== null}
        titulo={t('kits.deleteTitle')}
        descripcion={t('kits.deleteHint')}
        etiquetaConfirmar={t('common.delete')}
        etiquetaCancelar={t('common.cancel')}
        onCancelar={() => setBajaId(null)}
        onConfirmar={() => {
          if (!bajaId) {
            return;
          }
          void darBajaKit(request, orgId, bajaId)
            .then(() => {
              setBajaId(null);
              return cargar();
            })
            .catch((err) => setError(err instanceof Error ? err.message : t('kits.saveError')));
        }}
      />
    </div>
  );
}
