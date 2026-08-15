# Contexto de build: la RAÍZ del monorepo (ver docker-compose.yml).
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/jobs/package.json ./apps/jobs/
COPY packages/shared/package.json ./packages/shared/

FROM manifests AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter jobs...

FROM deps AS build
COPY turbo.json biome.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/jobs ./apps/jobs
RUN pnpm --filter @soschoco/shared build && pnpm --filter jobs build

FROM manifests AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter jobs... --prod

FROM base AS runner
ENV NODE_ENV=production
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/apps/jobs/node_modules ./apps/jobs/node_modules
COPY --from=build --chown=node:node /app/packages/shared/package.json ./packages/shared/
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=node:node /app/apps/jobs/dist ./apps/jobs/dist
COPY --from=build --chown=node:node /app/apps/jobs/package.json ./apps/jobs/
WORKDIR /app/apps/jobs
EXPOSE 3100
USER node
CMD ["node", "dist/main.js"]
