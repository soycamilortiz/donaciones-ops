---
"soschoco": patch
---

Correcciones: reprocesar una foto vuelve a encolar de verdad (BullMQ descartaba el job por id repetido), los nombres con la medida pegada ("Agua Brisa 600ml") vuelven a caer en la misma fila de inventario, `GET /donaciones` ya no revienta sin R2 configurado ni con un `?estado=` inválido, y `vencimiento` al confirmar una foto se valida como fecha. Además, catálogo de tipos del worker completo, textos de error de usuarios/roles/acopios/login pasados a i18n y el selector de acopio de una recepción nueva solo lista los activos.
