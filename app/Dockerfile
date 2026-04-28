# syntax=docker/dockerfile:1.7
#
# TenXPros production image.
#
# Strategy:
#   - Multi-stage Node 20 (bookworm-slim) build, mirrors the TenXRole pattern.
#   - corepack-managed pnpm 9.15.9 (matches `packageManager` in package.json).
#   - The final stage keeps the full app + node_modules so that
#     `pnpm db:deploy` and `pnpm db:seed` are runnable inside the container.
#     This makes migrations and seeding straightforward at deploy time.
#   - Listens on 0.0.0.0:3000 (mapped to host 3003 by docker-compose).

# -----------------------------------------------------------------------------
# Stage 1 — install dependencies (cached layer)
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS deps
ENV PNPM_HOME=/root/.local/share/pnpm \
    PATH=/root/.local/share/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2 — build (prisma generate + next build)
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS build
ENV PNPM_HOME=/root/.local/share/pnpm \
    PATH=/root/.local/share/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate \
 && apt-get update -qq \
 && apt-get install -y -qq --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate \
 && pnpm build

# -----------------------------------------------------------------------------
# Stage 3 — runtime
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
ENV PNPM_HOME=/root/.local/share/pnpm \
    PATH=/root/.local/share/pnpm:$PATH \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate \
 && apt-get update -qq \
 && apt-get install -y -qq --no-install-recommends openssl ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app /app

EXPOSE 3000

# Container-level health check that mirrors the app's /api/health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

# Apply pending migrations before booting Next.js. `migrate deploy` is
# idempotent and safe to retry. Seeding is intentionally NOT run here —
# run it once, manually, with:
#   docker compose exec tenxpros-app pnpm db:seed
# `pnpm start` runs `next start -H 0.0.0.0 -p 3000` per package.json.
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]
