# Transporte (TMS) y Entrega

Separación explícita del WMS de acopio: cuando la mercancía sale por la puerta, el dominio pasa de **despacho** (qué enviamos y desde dónde) a **transporte** (cómo lo llevamos) y **entrega** (qué recibió realmente el destinatario).

## Flujo completo

```
RECEPCIÓN → … → PALLETIZACIÓN → DESPACHO → TRANSPORTE → ENTREGA → POD
```

`MOVIMIENTO` sigue siendo transversal (recepción, putaway, picking, despacho, entrega, devolución).

## Tres capas

| Capa | Pregunta | Ejemplo de código |
| --- | --- | --- |
| **WMS — Despacho** | ¿Qué mercancía enviamos y desde dónde? | `DSP-2026-000082` |
| **TMS — Transporte** | ¿Cómo la llevamos? | `TRP-2026-000051` |
| **Entrega** | ¿Qué recibió el destinatario? | POD ligado al viaje |

Un despacho puede dividirse en **varios viajes** (camiones distintos o viajes parciales). Cada viaje tiene su vehículo, conductor, ruta, paradas y carga.

## Qué ya existía (despacho v2)

- Catálogos mínimos: `Transportista`, `Vehiculo`, `Conductor`
- `Viaje` + `Carga` / `CargaItem` bajo `Despacho` (carga en acopio)
- `ProofOfDelivery` básico (1:1 con despacho, sin UI)
- Movimiento `DESPACHO` al confirmar salida (baja inventario del acopio)

## Qué agrega transporte v1

### TMS (`apps/api/src/transporte/`)

| Entidad | Rol |
| --- | --- |
| `Transportista` | Empresa, ONG, público, voluntario, propio |
| `Vehiculo` | Placa, tipo, capacidades, transportista |
| `Conductor` | Documento, licencia, transportista |
| `Ruta` + `RutaParada` | Plantilla multi-parada reutilizable |
| `Viaje` | Entidad central (`TRP-YYYY-NNNNNN`), origen/destino, fechas, estado |
| `ViajeParada` + `ViajeParadaPallet` | Qué pallets se descargan en cada parada |
| `TransportEvent` | Seguimiento manual (salida, llegada parada, destino, incidencias) |

Estados de viaje: `PLANIFICADO`, `ASIGNADO`, `CARGANDO`, `LISTO`, `EN_TRANSITO`, `LLEGO_DESTINO`, `ENTREGADO`, `CANCELADO`, `RETORNADO`.

### Entrega (`apps/api/src/entrega/`)

| Concepto | Rol |
| --- | --- |
| `ProofOfDelivery` | Por **viaje** (no solo despacho): esperado vs recibido, daños, faltantes |
| Confirmación QR | Escaneo `PAL-DSP-…` en destino |
| Movimiento `ENTREGA` | Trazabilidad al cerrar (sin re-bajar saldo; ya salió con `DESPACHO`) |
| `DEVOLUCION` | Registro de mercancía no recibida (recepción de retorno: fase posterior) |

Estados POD: `PENDIENTE`, `PARCIAL`, `COMPLETA`, `CON_DIFERENCIAS`, `RECHAZADA`.

## API (v1)

Prefijo: `/api/v1/organizations/:orgId`

### Transporte

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/transporte/viajes` | Torre de control de viajes |
| GET | `/transporte/viajes/:id` | Detalle: carga, paradas, eventos |
| POST | `/transporte/viajes/:id/eventos` | Registrar evento de seguimiento |
| POST | `/transporte/viajes/:id/paradas` | Crear paradas (manual o desde ruta) |
| GET/POST | `/transportistas`, `/vehiculos`, `/conductores` | Catálogos |
| GET/POST | `/rutas` | Plantillas de ruta |

### Entrega

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/entregas/pendientes` | Viajes en tránsito sin POD completo |
| GET | `/entregas/viajes/:viajeId` | Contexto para confirmar entrega |
| GET | `/entregas/pallets/by-codigo/:codigo` | Lookup QR en destino |
| POST | `/entregas/viajes/:viajeId/confirmar` | POD + cierre de viaje |

## UI

| Ruta | Pantalla |
| --- | --- |
| `/app/transporte` | Torre de viajes en tránsito |
| `/app/transporte/:viajeId` | Detalle, eventos, paradas |
| `/app/entregas` | Entregas pendientes |
| `/app/entregas/:viajeId` | Confirmación POD con escaneo |
| `/app/rutas` | Plantillas de ruta multiparada |

## Rutas multiparada (v1)

1. **Plantilla** (`/app/rutas`): creá `RUT-YYYY-NNNN` con paradas ordenadas. Cada parada puede tener `destinoNombre` (municipio donde se descargan pallets).
2. **Viaje** (`/app/transporte/:id`): antes de salir, aplicá la plantilla al viaje.
3. **Asignación**: `POST …/auto-asignar-pallets` empareja `PAL-DSP` por `destinoNombre` del pallet vs parada. También escaneo manual por parada.
4. **Salida**: al confirmar despacho, se re-ejecuta auto-asignación si hay paradas.
5. **En tránsito**: llegada/salida por parada (`LLEGADA_PARADA`, `SALIDA_PARADA`).

Ejemplo:

```
Bogotá (tránsito)
  ↓
Municipio X  ← PAL-001, PAL-002
  ↓
Municipio Y  ← PAL-003, PAL-004
```

## Integración con despacho

1. **Crear viaje** (`POST …/despachos/:id/viajes`) — sigue en módulo despacho (carga en acopio).
2. **Confirmar salida** — pasa viaje a `EN_TRANSITO`, crea parada destino por defecto, evento `SALIDA`.
3. **Transporte** — seguimiento hasta destino.
4. **Entrega** — confirma recepción, kits `ENTREGADO`, movimiento `ENTREGA`.

## Próximas fases

- GPS / telemetría en `TransportEvent`
- Recepción de devolución (retorno al WMS)
- Capa de coordinación multi-acopio (demanda + inventario + transporte disponible)
- Contenedores marítimos / transporte aéreo como tipos de vehículo

## English summary

**Dispatch** answers *what* leaves the warehouse; **Transport (TMS)** answers *how* it moves (trips, routes, stops, events); **Delivery** answers *what the recipient actually received* (POD, variances, returns). One dispatch may span several trips. Inventory leaves the acopio on `DESPACHO`; `ENTREGA` closes the traceability loop without changing balances again.
