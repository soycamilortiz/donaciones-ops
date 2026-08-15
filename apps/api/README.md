# SOS Chocó API

NestJS + Prisma. La descripción del stack está en [docs/estado-actual.md](../../docs/estado-actual.md).

```bash
docker compose up postgres -d
pnpm install          # desde la raíz del monorepo
pnpm --filter api dev
```

Swagger: http://localhost:3000/api/docs (o http://localhost/api/docs con Traefik).

## Dos formas de arrancar

| Entrada | Para qué | Cómo |
| --- | --- | --- |
| `src/main.ts` → `dist/main.js` | Proceso de larga vida (Docker, Traefik) | `app.listen(PORT)` |
| `src/serverless.ts` → `api/index.js` | Función serverless (Vercel) | `app.init()` y devuelve el handler |

`main.ts` no sirve en serverless: `app.listen()` nunca devuelve el control y la función termina en `FUNCTION_INVOCATION_FAILED`.

`api/index.js` es JavaScript y no TypeScript **a propósito**. Vercel compila los entrypoints con esbuild, que no emite metadata de decoradores, y sin ella la inyección de dependencias de NestJS falla en ejecución. Por eso el entry solo delega en el `dist` que ya compiló `tsc` con `emitDecoratorMetadata`.

## Desplegar en Vercel

En el proyecto de Vercel, **Root Directory = `apps/api`**. El resto lo define [`vercel.json`](./vercel.json): instala desde la raíz del monorepo con `--filter api...`, compila `@soschoco/shared` y luego el API.

Variables de entorno obligatorias:

| Variable | Notas |
| --- | --- |
| `DATABASE_URL` | **Con pooler.** Ver más abajo |
| `JWT_SECRET` | Mínimo 16 caracteres |
| `CORS_ORIGIN` | El origen del front, separado por comas |
| `RBAC_SYNC_ON_BOOT` | `false` — ver abajo |
| `SWAGGER_ENABLED` | `false` en producción |
| `REDIS_URL` | Solo si se usa el módulo de donaciones |
| `R2_*` | Subida de fotos de donaciones (S3). Ver [r2-storage.md](../../docs/r2-storage.md) |

Si falta `DATABASE_URL` o `JWT_SECRET`, la validación de entorno lanza y la función **crashea al arrancar**: es la causa más común de un 500 en el primer despliegue.

### Por qué `RBAC_SYNC_ON_BOOT=false`

`RbacService` sincroniza el catálogo de roles y permisos al arrancar. En un proceso de larga vida se paga una vez; en serverless, en cada arranque en frío — son ~20 escrituras que retrasan la primera petición y tumban la función si la base no responde.

Con la bandera en `false` hay que sincronizar a mano tras cada despliegue que cambie el catálogo:

```bash
pnpm --filter api rbac:sync
```

### Pooling de conexiones

Cada arranque en frío abre una conexión a Postgres, y Vercel escala a muchas instancias en paralelo: sin un pooler, Postgres se queda sin conexiones. Apunta `DATABASE_URL` al puerto del pooler de tu proveedor (Supabase `:6543`, Neon con `-pooler`, o Prisma Accelerate).

Las migraciones necesitan conexión directa, así que se ejecutan aparte con la URL sin pooler:

```bash
DATABASE_URL="<url-directa>" pnpm --filter api prisma:deploy
```

### Lo que no puede vivir en Vercel

`apps/worker` es un proceso residente que escucha Redis; Vercel no hospeda eso. Si el API está en Vercel pero el worker no corre en ningún lado, las fotos se suben y quedan en `PENDIENTE` para siempre.

El worker necesita un host con procesos de larga vida (Docker, Railway, Render, Fly) y un Redis alcanzable desde ambos lados.
