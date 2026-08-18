---
"soschoco": patch
---

Lint en verde tras palletización/despacho: se borra `requirePalletLite`, duplicado exacto de `requirePallet` que nadie llamaba, y se quitan tres aserciones `!` innecesarias — `acopioId` no es nulo ni en Prisma ni en el contrato, y en las dos pantallas de pallets alcanzaba con atar el valor a un `const` para que TypeScript conserve el estrechamiento dentro del `onClick`.

Los contadores salen de las transacciones largas. `codigoPalletDespacho` y `codigoMovimiento` se pedían de a uno **dentro** de un `$transaction`, pero el servicio de contadores usa siempre el cliente base: cada llamada tomaba una segunda conexión del pool mientras la transacción ya retenía la suya, y con varios despachos a la vez eso la traba. Ahora se reserva el bloque completo en una sola consulta antes de abrir la transacción (`siguienteBloque`). Donde la transacción es corta y acotada —`depositarEnMuelle`— se hace al revés y el contador viaja en el `tx` del llamador, que es lo correcto ahí.

Las dos transacciones que recorren pallets y líneas de kit llevan `timeout` explícito: con los 5 s por defecto de Prisma, un despacho real se pasaba y revertía la salida entera con el camión ya cargado. En `confirmarSalida` los estados de kit y pallet pasan de un update por fila a dos `updateMany`.

Accesibilidad de las pantallas nuevas: esqueleto en vez de spinner de página completa en despachos, palletización, armado de pallet, carga, picking y detalle de demanda (la cabecera ya no desaparece ni salta al llegar los datos), confirmación audible del escaneo por el aviso flotante `aria-live` que ya existía, `scope="col"` en los encabezados de tabla que faltaban, y el estado vacío de despachos ahora dice cómo crear el primero. De paso, el armado de pallet ya no se queda cargando para siempre cuando la carga falla: muestra el error.
