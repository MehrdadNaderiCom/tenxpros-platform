# Deployment

## Environments

| Env | Purpose | Database | AI |
|-----|---------|----------|-----|
| Local dev | Engineer laptop, host-side `pnpm dev` | `tenxpros-db` (Postgres 16, host port 5433) | mock |
| Local containerised | The shipped image, run from compose | `tenxpros-db` over compose network (`db:5432`) | mock |
| Prod (`tenxpros.com`) | Public launch | dedicated db container | OpenRouter, monitored |

The compose stack at the repo root is the **production-style stack**.
It is what `tenxpros.com` resolves to today. See [DEPLOYMENT_AUDIT.md](DEPLOYMENT_AUDIT.md)
for the rollout details.

## Live deploy (compose, the path tenxpros.com uses)

The compose stack reads its environment from
`/opt/tenxpros/.env.production` (chmod 600, gitignored). That file is
the **only** place real secrets live for the production stack.

```bash
# from /opt/tenxpros
# 1. Provision .env.production once. See SECURITY_AND_COMPLIANCE.md for
#    the full template; minimum:
#      DATABASE_URL=postgresql://tenxpros:tenxpros_dev@db:5432/tenxpros
#      SESSION_SECRET=$(openssl rand -hex 32)
#      APP_URL=https://tenxpros.com
#      ALLOW_DEMO_USERS=false
#      ADMIN_EMAIL=admin@tenxpros.com
#      ADMIN_PASSWORD=<strong-random>
#      AI_ENABLED=false
#      AI_PROVIDER=mock
#      DEFAULT_REGION=eu-west
#      NODE_ENV=production
chmod 600 .env.production

# 2. Build + start (db + app).
docker compose up -d --build
docker compose ps                         # both should be (healthy)

# 3. Verify.
curl http://localhost:3003/api/health     # {"status":"ok","db":"ok",...}
curl https://tenxpros.com/api/health      # same, via Caddy
```

Migrations are applied automatically every time the app container
starts (`pnpm prisma migrate deploy && pnpm start`). The seed is a
one-off, idempotent step that:

1. Always seeds tracks, modules, lessons, rubrics, scenarios and
   global prompt packs.
2. **Always** upserts the secure admin from `ADMIN_EMAIL` +
   `ADMIN_PASSWORD` (if both are set).
3. Only creates demo users when `ALLOW_DEMO_USERS=true`. In production
   the seed instead **scrambles passwords on any pre-existing demo
   users** so the well-known development credentials cannot be reused.

```bash
docker compose exec tenxpros-app pnpm db:seed
```

### Containers and ports

| Service | Container | Host → container | Notes |
|---------|-----------|------------------|-------|
| `tenxpros-app` | `tenxpros-app` | `3003 → 3000` | Caddy proxies `tenxpros.com` here via `172.17.0.1:3003`. |
| `db` | `tenxpros-db` | `5433 → 5432` | Host-side mapping is for tools; in-container reachable as `db:5432`. |

### Compose service definitions

Single source of truth: [`/opt/tenxpros/docker-compose.yml`](../docker-compose.yml).

Highlights:

- `tenxpros-app.build.context: ./app` — builds the image from the
  app workspace using [`app/Dockerfile`](../app/Dockerfile).
- `tenxpros-app.environment.DATABASE_URL`:
  `postgresql://tenxpros:tenxpros_dev@db:5432/tenxpros` (note: **`db:5432`**
  inside compose, **not** `localhost:5433`).
- `tenxpros-app.depends_on.db.condition: service_healthy` — app waits
  for the `pg_isready` healthcheck before booting.
- Named volume `tenxpros-db-data` survives `docker compose down`.

## Local host-side dev (no Docker for the app)

```bash
docker compose up -d db                  # Postgres only
cd app
cp .env.example .env                     # if missing
pnpm install
pnpm db:generate
pnpm db:migrate                          # creates schema
pnpm db:seed                             # tracks, rubrics, scenarios, demo users
pnpm dev                                 # http://localhost:3000
```

### Useful commands

| Command | Purpose |
|---------|---------|
| `pnpm typecheck` | TypeScript strict |
| `pnpm lint` | ESLint via `next lint` |
| `pnpm test` | Vitest (no specs yet — placeholder) |
| `pnpm build` | Production build (`output: "standalone"`) |
| `pnpm start` | Run the standalone build on `:3000` |
| `pnpm db:reset` | Drop, re-create, re-seed (destructive — dev only) |
| `pnpm db:studio` | Prisma Studio at `:5555` |

## Reverse proxy contract

The host already runs the global Caddy proxy `tenxops-caddy-1`. It
handles `tenxpros.com` and `www.tenxpros.com` via:

```
tenxpros.com www.tenxpros.com {
    reverse_proxy 172.17.0.1:3003
}
```

`172.17.0.1:3003` is the Docker host gateway from the proxy's view.
**Anything bound to host port 3003 receives traffic.** The compose
stack now maps `tenxpros-app:3000 → host 3003`, so Caddy reaches the
real app. The Caddy block has not been modified.

The placeholder `nginx`/`html` content lives in `_legacy_placeholder/`
(plus the still-present `html/` directory) and is preserved for safe
reverts. See [DEPLOYMENT_AUDIT.md §10](DEPLOYMENT_AUDIT.md#10-rollback)
for the exact rollback steps.

## Container image (the actual one in production)

Multi-stage Node 20 (`node:20-bookworm-slim`) with corepack-managed
pnpm 9.15.9. Source of truth: [`app/Dockerfile`](../app/Dockerfile).

Stages:

1. **`deps`** — `pnpm install --frozen-lockfile` against the
   lockfile only. Cached unless lockfile changes.
2. **`build`** — copies the app workspace, runs `pnpm prisma generate`
   then `pnpm build`.
3. **`runtime`** — `node:20-bookworm-slim`, corepack pnpm, `openssl`,
   `ca-certificates`, `curl` (for healthcheck). Copies the entire
   built workspace + `node_modules` so `pnpm db:deploy` and
   `pnpm db:seed` work inside the container. Runs:
   ```
   pnpm prisma migrate deploy && pnpm start
   ```
   `migrate deploy` is idempotent and safe to retry on every start.

Image-level healthcheck pings `/api/health` every 30s.

## Environment variables

All app-side env values come from `/opt/tenxpros/.env.production`
(via `env_file:` in compose). Don't put real values in
`docker-compose.yml`.

| Name | Required in prod | Notes |
|------|:---:|-------|
| `DATABASE_URL` | yes | `postgresql://user:pw@db:5432/tenxpros` inside compose |
| `SESSION_SECRET` | yes | ≥ 32 chars; HMAC for cookie sessions. Generate with `openssl rand -hex 32`. **Rotate annually.** |
| `APP_URL` | yes | `https://tenxpros.com` in production. Used for `verifyUrl`, sign-out redirect, admin display, OG `metadataBase`. |
| `NODE_ENV` | yes | `production` |
| `ALLOW_DEMO_USERS` | yes | **`false` in production**. Controls whether `pnpm db:seed` creates demo users. |
| `ADMIN_EMAIL` | yes | Email for the production admin. The seed upserts an `ADMIN` user with this email and `ADMIN_PASSWORD`. |
| `ADMIN_PASSWORD` | yes | Strong random password (≥ 12 chars). The seed bcrypt-hashes it. |
| `AI_ENABLED` | no | Default `false`; mock used otherwise |
| `AI_PROVIDER` | no | `mock` (default) or `openrouter` |
| `AI_MODEL` | no | e.g. `anthropic/claude-3.5-sonnet` |
| `OPENROUTER_API_KEY` | only if `AI_PROVIDER=openrouter` | Never commit |
| `DEFAULT_REGION` | no | Compliance / data-residency note shown in admin |

`.env.production` is `chmod 600`, gitignored at root, and listed in
`docker-compose.yml` as `env_file: ./.env.production`.

## Database operations

- **Migrations** — `pnpm db:deploy` is the prod command; CI / startup
  applies pending migrations before the server accepts traffic.
- **Backups** — handled at the Postgres-volume level
  (`tenxpros-db-data` Docker volume). Production backups are out of
  scope for this repo and are owned by infra.
- **Schema changes** — only via Prisma migrations. No manual SQL on prod.

## Health & observability

- `GET /api/health` runs `SELECT 1` and returns 200 / 503 with
  `{ status, dbLatencyMs, version }`.
- AI runs are logged in `AIRunLog`; admin `/admin/ai-runs` provides a
  read-only view.
- `AuditLog` records mutations (sign-up, certificate state changes,
  employer requests).

## Rollback

Two rollback paths.

### Code rollback (stay on the new compose)

```bash
git checkout <previous-commit>
docker compose up -d --build tenxpros-app
```

### Full rollback to the nginx placeholder

The previous placeholder is preserved at `/opt/tenxpros/_legacy_placeholder/`.

```bash
cd /opt/tenxpros
docker compose down                   # stops app + db (volume preserved)
cp _legacy_placeholder/docker-compose.yml.bak docker-compose.yml
docker compose up -d                  # restores nginx placeholder + db
```

This restores the nginx + static `html/` placeholder on host port 3003.
The named volume `tenxpros-db-data` survives both directions, so any
seeded or user data persists if you re-roll-forward.
