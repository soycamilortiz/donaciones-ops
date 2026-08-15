# Contexto de build: la RAÍZ del monorepo (ver docker-compose.yml).
# pnpm necesita el lockfile, el pnpm-workspace.yaml y los paquetes compartidos.
FROM node:22-alpine AS base
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

# Manifiestos primero: maximiza el cache de capas de Docker.
FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/prisma ./apps/api/prisma

# Dependencias completas (dev incluidas) para compilar y para el modo watch.
FROM manifests AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter api...

FROM deps AS dev
COPY turbo.json biome.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @soschoco/shared build
ENV NODE_ENV=development
ENV CHOKIDAR_USEPOLLING=true
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["sh", "-c", "pnpm prisma generate && pnpm prisma migrate deploy && pnpm dev"]

FROM deps AS build
COPY turbo.json biome.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @soschoco/shared build && pnpm --filter api build

# Instalación limpia solo con dependencias de producción.
FROM manifests AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter api... --prod

FROM base AS runner
ENV NODE_ENV=production
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
# @soschoco/shared es un symlink del workspace: el destino real tiene que existir.
COPY --from=build --chown=node:node /app/packages/shared/package.json ./packages/shared/
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/
WORKDIR /app/apps/api
EXPOSE 3000
USER node
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
