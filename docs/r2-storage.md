# Cloudflare R2 — bucket `sos-choco`

Un solo bucket sirve **local (Docker)**, **preview de Vercel** y **producción**. Lo que cambia por entorno son las **variables**, no el bucket. El API y el worker hablan S3; el navegador solo **ve** las fotos por una URL pública.

```
PWA / Docker / Vercel  →  API (PutObject, URL firmada)
                         →  R2 S3 API  (privado)
Navegador              ←  R2_PUBLIC_BASE_URL /objeto.jpg
```

El **S3 API** del dashboard incluye el bucket al final. En env el endpoint va **sin** el nombre:

`https://<accountid>.r2.cloudflarestorage.com`  
`R2_BUCKET=sos-choco`

Las keys no salen de este dashboard: **R2 → Manage R2 API Tokens → Create API token** (Object Read & Write). Eso da `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY`. Nunca al front ni a Vercel como `NEXT_PUBLIC_*`.

## Cada apartado del dashboard

### Custom domains — **sí, para Vercel / prod**

Asigná un dominio tipo `media.tudominio.org` (el DNS tiene que estar en Cloudflare). Esa URL es `R2_PUBLIC_BASE_URL` en producción y en previews si querés las mismas fotos.

Sin custom domain las fotos no tienen URL estable de producción.

### Public development URL — **sí, solo para Docker local**

Enable. Cloudflare te da un `https://pub-….r2.dev`. Eso va en `R2_PUBLIC_BASE_URL` del `.env` local.

No uses `r2.dev` en Vercel producción: es para desarrollo, rate-limited y se puede rotar.

### R2 Data Catalog — **no**

Iceberg / analítica. No hace falta para servir JPG.

### CORS Policy — **sí**

El browser (localhost, Traefik, `*.vercel.app`) tiene que poder **subir** o **leer** si el front pega directo al bucket. Si el API sube y el front solo muestra `<img src="https://media…">`, CORS igual conviene para GET.

En **+ Add**, algo así:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost",
      "http://localhost:5173",
      "http://127.0.0.1",
      "http://soschoco.localhost",
      "https://*.vercel.app",
      "https://tudominio.org"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Cuando tengas el dominio real de Vercel, sumalo explícito (`https://app.tudominio.org`).

### Object lifecycle — **dejar el default**

La regla *Abort multipart after 7 days* está bien. No agregues “borrar a los N días”: las fotos de donación son evidencia operativa.

### Bucket lock — **no**

Bloquearía bajas lógicas / correcciones. No lo uses.

### Event notifications — **no**

Eso dispara Workers de Cloudflare. La cola nuestra es Redis + `apps/worker`.

### On Demand Migration — **no**

No estamos copiando un S3 viejo.

### Local Uploads (beta) — **no hace falta**

Solo si un día las subidas desde otra región van lentas.

### Default storage class — **Standard**

Correcto: las fotos se leen seguido. Infrequent Access no.

### Empty / Delete bucket — **no tocar**

Vaciar borra todas las fotos. Borrar el bucket tira la config.

## Qué poner en cada entorno

| Variable | Docker local | Vercel (preview / prod) |
| --- | --- | --- |
| `R2_ACCOUNT_ID` | el de la cuenta | el mismo |
| `R2_ACCESS_KEY_ID` / `SECRET` | token R2 | el mismo (env de Vercel, encrypted) |
| `R2_BUCKET` | `sos-choco` | `sos-choco` |
| `R2_ENDPOINT` | `https://<accountid>.r2.cloudflarestorage.com` | igual |
| `R2_PUBLIC_BASE_URL` | `https://pub-….r2.dev` | `https://media.tudominio.org` |

Compose ya pasa esas vars al **api** y al **worker**. En Vercel van en Project Settings → Environment Variables (Production y Preview). El front no las necesita si las URLs públicas ya vienen en la respuesta del API.

## Comprobar la conexión

Con el API arriba:

`GET /api/health/storage`

- **200** `info.r2.status: up` y el nombre del bucket: keys y `HeadBucket` OK.
- **503** si faltan `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` o `R2_ENDPOINT`, o si R2 rechaza la petición.

No forma parte de `/api/health/ready`: un R2 caído no debe tumbar el contenedor.

`R2_PUBLIC_BASE_URL` no entra en este chequeo (es para URLs de fotos, no para S3). No uses el S3 API (`*.r2.cloudflarestorage.com`) como URL pública.

## Subida de donaciones

1. La PWA pide `POST /api/v1/organizations/:orgId/donaciones/subidas/ruta`.
2. El API firma un **PUT** de 5 minutos contra el S3 API.
3. El navegador sube el archivo **directo a R2** (hace falta CORS con `PUT`).
4. La PWA registra `pathname`; el API arma `blobUrl` con `R2_PUBLIC_BASE_URL`.

Sin Public development URL (local) o custom domain (prod), el PUT puede funcionar y las fotos no se ven ni el worker puede descargarlas.
