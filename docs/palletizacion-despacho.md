# Palletización y control de salida (despacho)

Puente entre consolidación y salida física: unidades logísticas outbound (`PAL-DSP`), plan de estiba, **viajes** con vehículo, carga por QR, manifiesto, checklist y movimientos de inventario.

## Flujo operativo

```
Consolidación (CNS) → Plan (PLAN-PAL) → Pallets (PAL-DSP) → listos
  → Despacho (DSP) borrador → planificar → Viaje (VIA) + vehículo
  → cargar pallets (QR) → verificar carga → checklist → confirmar salida → EN_TRANSITO
```

Un despacho puede tener **varios viajes** (varios camiones). Cada viaje tiene una **carga** (`Carga` + `CargaItem`).

## Modelo

| Entidad | Código | Notas |
| --- | --- | --- |
| `PlanPalletizacion` | `PLAN-PAL-{YYYY}-{n}` | 1:1 con consolidación |
| `PalletDespacho` | `PAL-DSP-{YYYY}-{n}` | distinto de `UnidadLogistica` inbound |
| `Despacho` | `DSP-{YYYY}-{n}` | necesidad logística; estados extendidos |
| `Viaje` | `VIA-{YYYY}-{n}` | movimiento físico con vehículo |
| `Carga` / `CargaItem` | — | contenido del viaje (pallet v1) |
| `DespachoManifiesto` | — | fotografía oficial de lo que salió |
| `DespachoChecklist` | — | control de salida |
| `Transportista`, `Vehiculo`, `Conductor` | catálogo org | capacidad kg validada al planificar viaje |
| `ProofOfDelivery` | — | preparado para entrega (POD) |

## Estados despacho

`BORRADOR` → `PLANIFICADO` → `LISTO_PARA_CARGA` → `CARGANDO` → `CARGADO` / `PARCIAL` → `EN_TRANSITO` → `ENTREGADO`

Excepciones: `CANCELADO`, `RETENIDO`, `DEVUELTO`.

## API (`/api/v1/organizations/:orgId`)

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `planes-palletizacion/:planId/despachos` | Crea DSP en borrador |
| POST | `despachos/:id/planificar` | Valida pallets listos |
| POST | `despachos/:id/viajes` | Asigna vehículo; crea VIA + carga |
| POST | `despachos/:id/iniciar-carga` | `?viajeId=` opcional |
| POST | `despachos/:id/cargar-pallet` | `{ codigoPallet, viajeId? }` |
| POST | `despachos/:id/verificar-carga` | `?permitirParcial=true` |
| POST | `despachos/:id/checklist` | Control de salida |
| POST | `despachos/:id/confirmar-salida` | Movimientos `DESPACHO` + kits `DESPACHADO` |
| GET | `despachos` | Torre de control (org) |

(Palletización: mismas rutas `pallets-despacho/*` y `planes-palletizacion/*` que v1.)

## UI

- `/app/demandas/:id/palletizacion` — plan y pallets
- `/app/demandas/:id/carga?plan=…` — wizard: planificar → viaje → escaneo → checklist
- `/app/despachos` — torre de control

## Validaciones clave

- Pallet debe pertenecer al plan/destino del despacho
- Capacidad vehículo vs peso estimado/cargado
- Despacho parcial permitido (`PARCIAL`) con pallets pendientes en acopio
- Al confirmar salida: `InventoryMovimiento` tipo `DESPACHO` (no borrar stock sin trazabilidad)

## Pendiente

- Secuencia LIFO por paradas
- Items caja/contenedor/producto suelto en `CargaItem`
- POD con firma/foto/GPS en UI
- Entrega y reconciliación en destino
- Etiqueta imprimible QR en UI
