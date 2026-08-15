# SOS Chocó API

NestJS + Prisma. La descripción del stack está en [docs/estado-actual.md](../../docs/estado-actual.md).

```bash
docker compose up postgres -d
pnpm install          # desde la raíz del monorepo
pnpm --filter api dev
```

Swagger: http://localhost:3000/api/docs (o http://localhost/api/docs con Traefik).
