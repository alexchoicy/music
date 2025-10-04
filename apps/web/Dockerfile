FROM node:22-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web ./apps
COPY packages ./packages
RUN pnpm dlx turbo prune --scope=web --docker

FROM deps AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/out/json .
RUN pnpm install

COPY --from=deps /app/out/full/ .
RUN pnpm dlx turbo run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 music
RUN adduser --system --uid 1001 music
COPY --from=build --chown=1001:1001 /app/apps/.output ./

USER music

CMD ["node", "server/index.mjs"]