# Contexto de build: la RAÍZ del monorepo (ver docker-compose.yml).
FROM node:22-alpine AS base
# tesseract-ocr con los datos de español: el OCR corre como binario nativo,
# bastante más rápido que la variante WASM. libc6-compat lo necesita sharp.
RUN apk add --no-cache tesseract-ocr tesseract-ocr-data-spa libc6-compat openssl
RUN corepack enable
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/
# El worker comparte el cliente de Prisma que se genera desde el schema del API.
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

FROM manifests AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter worker... --filter api

FROM deps AS dev
COPY turbo.json biome.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/worker ./apps/worker
RUN pnpm --filter @soschoco/shared build
ENV NODE_ENV=development
WORKDIR /app/apps/worker
CMD ["pnpm", "dev"]

FROM deps AS build
COPY turbo.json biome.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/worker ./apps/worker
RUN pnpm --filter @soschoco/shared build && pnpm --filter worker build

# Se incluye `api` a propósito: su postinstall ejecuta `prisma generate`, y sin
# esa generación el cliente que hereda el worker no conoce los modelos. Cuesta
# algo de tamaño de imagen, pero evita depender de rutas con hash del store.
FROM manifests AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter worker... --filter api --prod

FROM base AS runner
ENV NODE_ENV=production
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=build --chown=node:node /app/packages/shared/package.json ./packages/shared/
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=node:node /app/apps/worker/dist ./apps/worker/dist
COPY --from=build --chown=node:node /app/apps/worker/package.json ./apps/worker/
WORKDIR /app/apps/worker
USER node
CMD ["node", "dist/main.js"]
