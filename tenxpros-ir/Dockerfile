FROM node:24-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@9.15.9
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN pnpm db:generate
RUN pnpm build
RUN pnpm prune --prod

FROM node:24-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV TENXPROS_DEPLOYMENT_MODE=docker
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates gosu openssl tini \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global pnpm@9.15.9
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod 0755 /app/docker-entrypoint.sh \
  && mkdir -p /app/uploads \
  && chown node:node /app/uploads

EXPOSE 3100

ENTRYPOINT ["tini", "--", "/app/docker-entrypoint.sh"]
CMD ["pnpm", "start"]
