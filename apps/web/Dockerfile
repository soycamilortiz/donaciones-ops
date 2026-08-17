# Contexto de build: la RAÍZ del monorepo (ver docker-compose.yml).
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter web...

FROM deps AS dev
COPY turbo.json biome.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm --filter @soschoco/shared build
ENV CHOKIDAR_USEPOLLING=true
WORKDIR /app/apps/web
EXPOSE 80
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "80"]

FROM deps AS build
COPY turbo.json biome.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN pnpm --filter @soschoco/shared build && pnpm --filter web build

FROM nginx:1.27-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
