# Control y consolidación — dominio

Después del kitting, la pregunta deja de ser «¿armamos los kits?» y pasa a «¿están completos, correctos y listos para una carga de despacho?».

Español (fuente de verdad). English summary at the end.

## Flujo

```
RESERVA FIRME → ARMAR (identidades) → CONTROL → CONSOLIDACIÓN → (palletización PAL-DESP, después)
```

Control y consolidación viven en el mismo módulo. Palletizar (crear `PAL-DESP` con QR, peso real, estiba física) es el paso siguiente.

## Armar kits (picking)

«Preparar picking» crea `kit_instancias` en estado `PENDIENTE_PICK` desde una reserva `RESERVADA`. Cada línea incluye **ubicación origen** (desde `reserva_asignaciones`), producto, lote y cantidad.

El operador, en `/app/demandas/:id/picking`:

1. Va a la ubicación origen indicada.
2. Confirma el código origen y el de la zona **KITTING** o **PICKING** del acopio.
3. El sistema mueve el stock reservado (movimiento `PICKING`) a esa zona.
4. Cuando todas las líneas están pickeadas, confirma **kit armado** → estado `ARMADO` y la reserva pasa a `CONSUMIDA` si no quedan kits pendientes.

Requisito: al menos una ubicación activa con función `KITTING` o `PICKING` en el acopio.

Códigos: `KIN-YYYY-n`, `CTL-YYYY-n`, `CNS-YYYY-n`.

## Receta

El BOM del kit (`kit_componentes`) es lo que el control espera encontrar. Peso y alto estimados (`peso_kg_estimado`, `alto_m_estimado`) alimentan la propuesta de pallets. Sin ellos, el default es 20 kg y 0,06 m de alto (tope de pallet 800 kg / 1,80 m).

## Control

Cada kit físico se inspecciona contra la receta.

| Resultado | Sigue a |
| --- | --- |
| `APROBADO` | Consolidación |
| `OBSERVADO` | Corrección y un control nuevo |
| `RECHAZADO` | Desarmar / reprocesar (fuera de v1) |

Modos:

| Modo | Qué revisa |
| --- | --- |
| `TOTAL` | Todos los kits armados |
| `MUESTREO` | Default 10%. Si al **cerrar la muestra** el defecto (observado + rechazado) supera el umbral (default 5%), el lote pide control 100% |

No se evalúa el umbral a mitad de muestra: un rechazo en el primer kit no dispara solo el 100%.

## Trazabilidad de composición

```
KIT_INSTANCIA
 └── KIT_INSTANCIA_ITEM
       ├── producto
       ├── lote
       ├── cantidad
       └── unidad (la del producto)
```

Se puede responder «qué lotes hay en el KIT #n» y, al revés, filtrar `kit_instancia_items.lote_codigo`.

## Consolidación ≠ palletización

| | Consolidación | Palletización |
| --- | --- | --- |
| Decide | Qué kits aprobados viajan juntos (destino de la demanda) | Cómo se acomodan en estibas físicas |
| v1 | Crea `consolidaciones` + propuesta de pallets | **Fuera.** No crea `PAL-DESP` |

La propuesta no empaqueta en 3D. Calcula:

```
kitsPorPallet = min(floor(pesoMax / pesoKit), floor(altoMax / altoKit))
pallets = ceil(kitsAprobados / kitsPorPallet)
```

Ejemplo: 780 kits de 20 kg, tope 800 kg y 1,80 m / 0,06 m → 30 por pallet, 26 pallets.

Un pallet de recepción (`PAL-REC`) no es el de despacho. El de salida se crea en palletización.

## Pipeline

En la demanda:

| Cifra | Significado |
| --- | --- |
| Solicitado | Lo que pide la demanda |
| Reservado | Reserva firme |
| Armado | Instancias creadas |
| Aprobado | Control OK (incluye ya consolidados) |
| Observado / rechazado | No siguen a consolidación |
| Consolidado | Agrupados para el destino |

Permisos: `inventory:read` / `inventory:write`. Baja lógica: `isActive`.

## Qué queda fuera

Optimización de ruta de pick (orden de pasillos). QR de cámara. Palletización `PAL-DESP`, shipment/carga, peso real vs teórico al estibar.

---

## English

After kitting, each physical kit is checked against the BOM. Results are approved / observed / rejected. Sampling (default 10%) expands to 100% if the finished sample exceeds the defect threshold (default 5%). Critical kits always use 100%. Assembling kits in v1 creates identities and lot composition from the firm reservation without moving inventory. Consolidation groups approved kits for a destination and proposes how many fit per pallet (weight and height caps); physical outbound pallets (`PAL-DESP`) come next.
