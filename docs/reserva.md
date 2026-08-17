# Reserva — dominio

Comprometer inventario para una **demanda**, sin sacarlo de la bodega. Picking es el paso siguiente.

Español (fuente de verdad). English summary at the end.

## Qué no es

Reserva **no** descuenta stock físico. El arroz sigue en A-01-01. Lo que cambia es la cifra **disponible**.

Tampoco es una cantidad suelta: no existe “reservar 500 de arroz” sin saber para quién. Toda reserva cuelga de una demanda.

## Flujo

```
DEMANDA → KIT/BOM → ¿qué necesito? → DISPONIBILIDAD → ¿qué puedo cubrir? → RESERVA → ¿de dónde sale? → (picking, después)
```

Movimiento de zonas es **transversal**: se puede reubicar antes o después de reservar. Si el origen tiene reserva firme, no se puede mover más de lo libre.

## Tres cantidades

Para cada ítem (y por ubicación):

| Cifra | Significado |
| --- | --- |
| Total | Lo que hay físicamente (`inventory_balances`) |
| Reservado | Compromiso **firme** (`RESERVADA`) |
| Disponible | Total ubicado − reservado firme |
| Pre-reservado | Informativo. No bloquea disponible |

El muelle (`RECEPCION`) no entra al pool de reserva. Solo `ALMACENAMIENTO` y `PICKING`. Vencido no se reserva.

## Demanda ≠ reserva

| | Demanda | Reserva |
| --- | --- | --- |
| Dice | “Municipio X necesita 1.000 kits” | “Comprometo inventario para 800 kits” |
| Si falta stock | Queda abierta / parcial | Se crea por lo **posible** |
| Al cancelar | Libera reservas | El stock vuelve a disponible |

Déficit = solicitado − cubierto (reservas firmes). Se puede ampliar la reserva cuando entra más donación.

## Kit y BOM

El operador pide kits. El sistema explota componentes (`kit_componentes`) contra `inventory_items.productoId`. Sin `productoId` en el stock, esa fila no entra al kit.

Máximo producible = cuello de botella del BOM (FEFO aparte). Ejemplo: pasta 100 / 0,5 por kit → 200 kits aunque el arroz sobre.

## Asignación

1. **FEFO** por lote: vence primero, sin fecha al final, luego código de ubicación.
2. **Asignación concreta**: no “500 kg de arroz”, sino 300 del lote A en A-01-01 y 200 del lote B en B-02-03 (`reserva_asignaciones`).
3. **Stock escaso entre demandas**: greedy por prioridad (`CRITICA` → `ALTA` → `MEDIA` → `BAJA`), después fecha requerida, después antigüedad. No es proporcional. El tope de bodega se calcula **una vez por kit**; no se suma la capacidad de cada demanda.

Kits distintos que comparten un ingrediente todavía pueden sobrecontar entre sí (v1).

## Estados

Demanda: `ABIERTA` → `PARCIAL` → `CUBIERTA`. `CANCELADA` libera. `CERRADA` no admite más reservas.

Reserva: `PRE_RESERVA` (no bloquea) → `RESERVADA` (bloquea) → `LIBERADA` / `CANCELADA` / `CONSUMIDA` (picking, todavía no).

Códigos: `KIT-n`, `DEM-YYYY-n`, `RES-YYYY-n`.

Permisos: `inventory:read` / `inventory:write`. Baja lógica: `isActive`.

## Qué queda fuera

Picking, kitting, palletización y despacho. QR de cámara. Reparto proporcional. Motor de distancia al elegir rack.

---

## English

A demand is the need (destination, kit, priority). A reservation commits warehouse stock to that demand without moving it. The BOM explodes kits into product requirements; coverage is the BOM bottleneck. Allocation is FEFO by lot/location. Soft pre-reserve does not block availability; a firm reserve does. Cancelling a demand releases reservations. Scarce stock is split greedily by priority, then required date — not first-come. Picking is the next stage.
