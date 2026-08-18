-- Legacy despacho states (must run after enum values are committed; see despacho_v2 migration).
UPDATE "despachos" SET "estado" = 'CARGANDO' WHERE "estado" = 'EN_CARGA';
UPDATE "despachos" SET "estado" = 'CARGADO' WHERE "estado" = 'LISTO';
UPDATE "despachos" SET "estado" = 'EN_TRANSITO' WHERE "estado" = 'EN_RUTA';
UPDATE "despachos" SET "estado" = 'CANCELADO' WHERE "estado" = 'ANULADO';
