FROM ghcr.io/pnpm/pnpm:12.17.0 AS deps
ENV CI=true

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/web ./apps/web
COPY packages/api ./packages/api
RUN pnpm --filter web run build

FROM node:26-trixie-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build --chown=node:node /app/apps/web/.output ./.output
COPY --from=build --chown=node:node /app/apps/web/package.json ./package.json
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
