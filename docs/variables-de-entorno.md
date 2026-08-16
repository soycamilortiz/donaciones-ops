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
| `BLOB_READ_WRITE_TOKEN` | — (obsoleto) | — | — | — |
| `R2_*` | ✅ | ✅ | — | — |
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

Cada app es un proyecto propio de Vercel apuntando **al mismo repositorio**, lo
único que cambia es el *Root Directory*. El `vercel.json` de cada app ya define
el build; en la interfaz solo hay que fijar el directorio y las variables.

| Proyecto | Root Directory | Framework Preset |
| --- | --- | --- |
| `donaciones-ops-api` | `apps/api` | Other |
| `donaciones-ops-web` | `apps/web` | Vite |
| `donaciones-ops-jobs` | `apps/jobs` | Other |

En los tres hay que dejar activado **"Include source files outside of the Root
Directory"**, porque el build instala desde la raíz del monorepo y necesita
`pnpm-workspace.yaml`, el lockfile y `packages/shared`.

`NODE_ENV` no se configura: Vercel la fija en `production`. `PORT` tampoco: en
serverless quien escucha es el runtime.

### Proyecto `api` — Root Directory `apps/api`

| Variable | Valor | Secreto |
| --- | --- | :-: |
| `DATABASE_URL` | `postgresql://USUARIO:CLAVE@HOST:6543/DB?pgbouncer=true&connection_limit=1` | ✅ |
| `JWT_SECRET` | 32+ caracteres aleatorios (`openssl rand -base64 32`) | ✅ |
| `CORS_ORIGIN` | `https://donaciones-ops-web.vercel.app` | |
| `JWT_EXPIRES_IN` | `8h` | |
| `REDIS_URL` | `rediss://default:CLAVE@HOST.upstash.io:6379` | ✅ |
| `R2_ACCOUNT_ID` | el de Cloudflare | |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | token S3 de R2 | ✅ |
| `R2_BUCKET` | `sos-choco` | |
| `R2_ENDPOINT` | `https://<accountid>.r2.cloudflarestorage.com` | |
| `R2_PUBLIC_BASE_URL` | custom domain o `https://pub-….r2.dev` | |
| `RBAC_SYNC_ON_BOOT` | `false` | |
| `SWAGGER_ENABLED` | `false` | |

El puerto `6543` y `pgbouncer=true` son de Supabase; en Neon el host lleva
`-pooler`. `connection_limit=1` es lo recomendado en serverless: cada instancia
abre su propia conexión y no debe acaparar el pool.

### Proyecto `web` — Root Directory `apps/web`

**Ninguna variable.** El front llama a `/api` en el mismo origen y el rewrite de
`apps/web/vercel.json` lo reenvía al despliegue del API. Si la URL del API no es
`https://donaciones-ops-api.vercel.app`, hay que corregir ese `destination`.

Que no lleve variables es deliberado: todo lo que entra en un bundle de front es
público, así que ahí no puede haber secretos.

### Proyecto `jobs` — Root Directory `apps/jobs`

| Variable | Valor | Secreto |
| --- | --- | :-: |
| `REDIS_URL` | **el mismo** que el del API | ✅ |
| `JOBS_USER` | `admin` | |
| `JOBS_PASSWORD` | 16+ caracteres aleatorios | ✅ |
| `JOBS_BASE_PATH` | `/jobs` | |

Si el `REDIS_URL` no es idéntico al del API, el panel se ve vacío: estaría
mirando otra instancia.

### El worker no va a Vercel

`apps/worker` es un proceso residente que escucha Redis; Vercel no hospeda eso.
Su `Dockerfile` corre tal cual en cualquier host de contenedores (Railway,
Render, Fly, o un VPS con el compose). Necesita:

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | la **directa**, sin pooler: es un proceso largo con una sola conexión |
| `REDIS_URL` | el mismo que el API y el panel |
| `OCR_*` | los valores por defecto sirven |

Sin el worker corriendo en algún lado, las fotos se suben pero se quedan en
`PENDIENTE` para siempre.

### Después del primer despliegue

Las migraciones y la siembra no corren solas. Una vez, con la URL **directa**
(sin pooler):

```bash
DATABASE_URL="<url-directa>" pnpm --filter api prisma:deploy
DATABASE_URL="<url-directa>" pnpm --filter api rbac:sync
psql "<url-directa>" -f apps/api/prisma/seed-productos.sql
```

`rbac:sync` hay que repetirlo tras cada despliegue que cambie el catálogo de
roles o permisos, porque `RBAC_SYNC_ON_BOOT` está en `false`.

### Sobre el costo de Upstash

BullMQ hace polling con comandos bloqueantes y Upstash cobra por comando. El
API solo **produce** (un `add()` por foto), así que su consumo es mínimo. El que
haría polling constante es el worker, y ese no está en Vercel: conviene tenerlo
cerca del Redis o usar un Redis propio en el mismo host.

## Defaults que ya no hay que configurar

`RBAC_SYNC_ON_BOOT` y `SWAGGER_ENABLED` detectan el entorno: si existe `VERCEL=1`
valen `false` por defecto, que es lo correcto en serverless. Solo hay que
tocarlos para forzar lo contrario.

`DATABASE_URL` y `REDIS_URL` **no pueden tener un default útil**. No es que el
valor esté mal escrito: la base tiene que existir en una dirección alcanzable
desde donde corre la app. `localhost` en una función de Vercel es el propio
contenedor efímero, no tu máquina.

## La API no se cae si la base no responde

`PrismaService` registra el fallo de conexión y deja la aplicación en pie. Antes
propagaba el error, Nest moría en el arranque y **todas** las rutas devolvían
500 — incluidas las de salud, que son las que sirven para diagnosticar.

| Ruta | Con la base caída |
| --- | --- |
| `/api/health` | 200 (el proceso está vivo) |
| `/api` | 200 |
| `/api/health/ready` | 503 con el motivo exacto |
| Rutas con datos | Fallan una a una, con su error |

La sincronización de RBAC al arrancar tampoco tumba el proceso: si la base no
responde lo registra y sigue.

## Qué rompe si se mezcla

| Síntoma | Causa |
| --- | --- |
| `P1001: Can't reach database server` en Vercel | `DATABASE_URL` apunta a `postgres:5432`, que solo existe dentro de Docker |
| `FUNCTION_INVOCATION_FAILED` al primer despliegue | Falta `DATABASE_URL` o `JWT_SECRET`: la validación de entorno lanza al arrancar |
| Las fotos se quedan en `PENDIENTE` | El worker no está corriendo, o mira un Redis distinto al del API |
| `Too many connections` en Postgres | Falta el pooler en serverless |
| El panel de jobs muestra colas vacías | El `REDIS_URL` del panel no es el mismo que el del API |
