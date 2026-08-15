# Contexto para el agente

Producto: logística humanitaria (donaciones, acopios, envíos). Un dominio, Traefik por path. Responder en **español**.

## Changesets

Desde ahora **todo cambio de producto lleva changeset**. Detalle en `.cursor/rules/changesets.mdc` y `docs/estado-actual.md`.

```bash
npm run changeset
```

Paquete a versionar: `soschoco` (raíz). No publicar a npm.

## Arquitectura (resumen)

- `apps/web` React 19 + Vite; `apps/api` NestJS 11 + Prisma 6 + PostgreSQL 16
- Auth JWT propia (no Clerk). Prefijo `api`, URI `v1`, Swagger `/api/docs`
- Rutas: `infra/traefik/dynamic/routes.yml`
- Inventario por centro de acopio; org no se crea obligatoria al registrarse
- **No borrar** registros de dominio: `isActive`. El alta de inventario siempre nace activa; no mandar `isActive: false` en el create.
