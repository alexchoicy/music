FROM node:24-bookworm-slim AS pnpm-base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable

WORKDIR /app

FROM pnpm-base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --filter web

FROM deps AS build
COPY apps/web ./apps/web
RUN pnpm --filter web run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build --chown=node:node /app/apps/web/.output ./.output
COPY --from=build --chown=node:node /app/apps/web/package.json ./package.json
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
