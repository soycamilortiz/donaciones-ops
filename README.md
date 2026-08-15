# SOS Chocó

Logística de donaciones, centros de acopio y envíos. Un dominio, varios contenedores.

Documentación de lo que hay hoy: [docs/estado-actual.md](docs/estado-actual.md).

## Arranque

```bash
docker compose up --build
```

Abre [http://localhost](http://localhost). En Windows, `soschoco.localhost` no siempre resuelve; `localhost` sí.

| URL | Servicio |
| --- | --- |
| http://localhost | Shell (front) |
| http://localhost/api | Metadatos API |
| http://localhost/api/health | Liveness |
| http://localhost/api/health/ready | PostgreSQL |
| http://localhost/api/docs | Swagger UI |
| http://localhost/api/docs/openapi.json | OpenAPI 3 (JSON) |
| http://localhost:8080 | Dashboard Traefik |

Las rutas viven en `infra/traefik/dynamic/routes.yml`. Un front nuevo se engancha ahí con `PathPrefix`.

## Desarrollo local (sin rebuild de imagen)

```bash
docker compose up postgres traefik -d
cd apps/api && npm install && npm run start:dev
cd apps/web && npm install && npm run dev
```

- API: `http://localhost:3000/api`
- Front Vite: `http://localhost:5173` (proxy `/api` → Nest)
- Postgres: `localhost:5432`

## Estructura

```
apps/api    NestJS + Prisma + PostgreSQL
apps/web    Shell React (Vite)
```

Los siguientes fronts se enganchan en Traefik con `PathPrefix` (`/donaciones`, `/acopio`, `/envios`).
