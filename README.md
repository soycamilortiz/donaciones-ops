# SOS Chocó

Logística de donaciones, centros de acopio y envíos. Un dominio, varios contenedores.

Documentación de lo que hay hoy: [docs/estado-actual.md](docs/estado-actual.md).

Los cambios de producto se registran con **Changesets** ([guía](docs/changesets.md)). En la raíz: `npm install` una vez, después `npm run changeset`.

## Arranque

```bash
docker compose up --build
```

Abre [http://localhost](http://localhost). En Windows, `soschoco.localhost` no siempre resuelve; `localhost` sí.

| URL | Servicio |
| --- | --- |
| http://localhost | Shell (front) |
| http://localhost/sign-up | Registro |
| http://localhost/sign-in | Login |
| http://localhost/app | Panel (JWT) |
| http://localhost/api | Metadatos API |
| http://localhost/api/health | Liveness |
| http://localhost/api/health/ready | PostgreSQL |
| http://localhost/api/docs | Swagger UI |
| http://localhost/api/docs/openapi.json | OpenAPI 3 (JSON) |
| http://localhost:8080 | Dashboard Traefik |

Auth propia: usuario/contraseña, captcha y JWT (`JWT_SECRET` en `.env`). Las rutas viven en `infra/traefik/dynamic/routes.yml`.

## Desarrollo local (sin rebuild de imagen)

Opción A — API y front en el host (más rápido en Windows):

```bash
docker compose up postgres traefik -d
cd apps/api && npm install && npm run start:dev
cd apps/web && npm install && npm run dev
```

- API: `http://localhost:3000/api`
- Front Vite: `http://localhost:5173` (proxy `/api` → Nest)
- Postgres: `localhost:5432`

Opción B — recarga dentro de Docker (polling; en Windows puede ir más lento):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

`docker compose up --build` **sin** el archivo `.dev` arma imágenes de producción: no recargan al editar código.

## Estructura

```
apps/api    NestJS + Prisma + PostgreSQL + JWT
apps/web    Shell React (Vite): login, onboarding, panel
```

Los siguientes fronts se enganchan en Traefik con `PathPrefix` (`/donaciones`, `/acopio`, `/envios`).
