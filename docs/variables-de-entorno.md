# Variables de entorno

Cómo se conectan las apps entre sí, según dónde corran.

## La regla

**Las URL de conexión no se escriben a mano en ningún lado.** Dependen de la
topología:

| Dónde corre | `DATABASE_URL` | `REDIS_URL` |
| --- | --- | --- |
| Docker Compose | `postgresql://…@postgres:5432/…` | `redis://redis:6379` |
| Apps en el host | `postgresql://…@localhost:5432/…` | `redis://localhost:6379` |
| Vercel u otro serverless | URL pública del Postgres gestionado, **con pooler** | URL pública del Redis gestionado, con TLS (`rediss://`) |

`postgres` y `redis` son nombres DNS que solo existen dentro de la red
`soschoco` de Docker. Una función en Vercel no puede resolverlos: necesita
servicios con dirección pública.

## Quién necesita qué

| Variable | api | worker | jobs | web |
| --- | :-: | :-: | :-: | :-: |
| `DATABASE_URL` | ✅ | ✅ | — | — |
| `REDIS_URL` | ✅ | ✅ | ✅ | — |
| `JWT_SECRET` | ✅ | — | — | — |
| `CORS_ORIGIN` | ✅ | — | — | — |
| `BLOB_READ_WRITE_TOKEN` | ✅ | — | — | — |
| `JOBS_USER` / `JOBS_PASSWORD` | — | — | ✅ | — |
| `OCR_*` | — | ✅ | — | — |
| `RBAC_SYNC_ON_BOOT` / `SWAGGER_ENABLED` | ✅ | — | — | — |

El front **no lleva variables**: llama a `/api` en el mismo origen y el
enrutamiento lo resuelve Traefik (en Docker) o un rewrite (en Vercel). Por eso
tampoco hay secretos en el bundle, que es lo correcto — todo lo que va a un
front es público.

El worker necesita `DATABASE_URL` porque escribe el resultado del
reconocimiento, no solo consume la cola.

## Docker Compose

Un solo archivo `.env` en la raíz, copiado de `.env.example`. Ahí van
credenciales y secretos; el compose deriva las URL:

```yaml
DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
REDIS_URL: redis://redis:6379
```

Cambiar `POSTGRES_PASSWORD` actualiza a `api` y `worker` a la vez, porque ambos
la construyen a partir de la misma variable. No hay que tocar nada más.

```bash
cp .env.example .env
docker compose up --build
```

## Apps en el host, infraestructura en Docker

Útil para desarrollar sin reconstruir imágenes:

```bash
docker compose up postgres redis -d
```

Aquí sí hay que apuntar a `localhost`, porque los procesos están fuera de la red
de Docker. Cada app lee su propio `.env` (ver los `.env.example` de cada una):

```bash
# apps/api/.env y apps/worker/.env
DATABASE_URL=postgresql://soschoco:soschoco@localhost:5432/soschoco
REDIS_URL=redis://localhost:6379
```

## Vercel

Cada app es un proyecto propio de Vercel apuntando al mismo repo, cambiando el
**Root Directory**. Las variables se cargan en cada proyecto por separado.

| Proyecto | Root Directory | Variables |
| --- | --- | --- |
| `…-api` | `apps/api` | `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `REDIS_URL`, `BLOB_READ_WRITE_TOKEN`, `RBAC_SYNC_ON_BOOT=false`, `SWAGGER_ENABLED=false` |
| `…-web` | `apps/web` | ninguna |
| `…-jobs` | `apps/jobs` | `REDIS_URL`, `JOBS_USER`, `JOBS_PASSWORD` |

`apps/worker` no va a Vercel: es un proceso residente que escucha Redis.

En serverless, `DATABASE_URL` **tiene que apuntar al pooler** del proveedor
(Supabase `:6543`, Neon con `-pooler`). Cada arranque en frío abre una conexión
y Vercel escala a muchas instancias en paralelo; sin pooler, Postgres se queda
sin conexiones. Las migraciones necesitan la URL directa:

```bash
DATABASE_URL="<url-directa-sin-pooler>" pnpm --filter api prisma:deploy
```

Y `RBAC_SYNC_ON_BOOT=false`, porque si no se ejecutan ~20 escrituras en cada
arranque en frío. Tras cada despliegue que cambie el catálogo:

```bash
pnpm --filter api rbac:sync
```

## Qué rompe si se mezcla

| Síntoma | Causa |
| --- | --- |
| `P1001: Can't reach database server` en Vercel | `DATABASE_URL` apunta a `postgres:5432`, que solo existe dentro de Docker |
| `FUNCTION_INVOCATION_FAILED` al primer despliegue | Falta `DATABASE_URL` o `JWT_SECRET`: la validación de entorno lanza al arrancar |
| Las fotos se quedan en `PENDIENTE` | El worker no está corriendo, o mira un Redis distinto al del API |
| `Too many connections` en Postgres | Falta el pooler en serverless |
| El panel de jobs muestra colas vacías | El `REDIS_URL` del panel no es el mismo que el del API |
