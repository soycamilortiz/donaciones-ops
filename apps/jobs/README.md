# Panel de jobs

Monta [Bull Board](https://github.com/felixmosh/bull-board) sobre las colas que
consume `apps/worker`. Sirve para ver qué hay encolado, qué falló y por qué, sin
entrar a Redis a mano.

```bash
docker compose up redis -d
pnpm install                  # desde la raíz
JOBS_PASSWORD=una-clave-larga pnpm --filter jobs dev
```

Con Docker queda en `http://localhost/jobs`, enrutado por Traefik.

## Autenticación

Basic auth con `JOBS_USER` / `JOBS_PASSWORD`. No es opcional: el panel permite
pausar colas y borrar jobs, así que el proceso no arranca sin contraseña.

La comparación es de tiempo constante (`timingSafeEqual`) porque es un endpoint
expuesto y comparar con `===` filtra información por el tiempo de respuesta.

## Agregar una cola

Al crear un job nuevo en `apps/worker/src/jobs`, súmalo a la lista de colas en
`src/main.ts`. El nombre sale de `@soschoco/shared`, así que productor,
consumidor y panel no pueden divergir.

## Rutas

| Ruta | Qué es |
| --- | --- |
| `/health` | Liveness del contenedor. Sin autenticación, a propósito |
| `/jobs` | El panel |
