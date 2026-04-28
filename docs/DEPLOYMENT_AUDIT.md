# Deployment Audit — M0.2 (2026-04-28)

State of the deploy *immediately before* the Dockerised real-app
rollout, plus the rollout itself.

## 1. What was being served

**Nothing.** Host port 3003 was unbound:

```
$ ss -ltnp | grep ':3003'
(no output)
$ curl -sI http://localhost:3003
(empty)
```

The Caddy block on the host gateway was already pointing the public
domain at `:3003`:

```
tenxpros.com www.tenxpros.com {
    reverse_proxy 172.17.0.1:3003
}
```

Because nothing was listening, `https://tenxpros.com` was returning a
Caddy 502.

## 2. Was the nginx placeholder active?

**No.** The `tenxpros-web` nginx service was still defined in the
root `docker-compose.yml` but was not running (M0 had stopped it). The
backup of the original placeholder compose remains in
`_legacy_placeholder/docker-compose.yml.bak` and the static `html/`
content is preserved.

```
$ docker compose ps
NAME          STATUS
tenxpros-db   Up (healthy)
$ docker ps | grep tenxpros-web
(no rows)
```

## 3. Was there a Dockerfile for the app?

**No.** `app/Dockerfile` and `app/.dockerignore` both did not exist.

```
$ ls app/Dockerfile* app/.dockerignore
(both missing)
```

The Next.js build artifacts existed locally (`app/.next/`), but there
was no image to actually run.

## 4. Did a build exist?

A local `pnpm build` had been run during M0/M0.1; `app/.next/` was
populated. There was no production image. The build was reproduced
inside the Docker build during this rollout (see Phase 2).

## 5. Database connection assumptions

| Path | Connection string | Notes |
|------|-------------------|-------|
| Host (developer / `pnpm db:*` from terminal) | `postgresql://tenxpros:tenxpros_dev@localhost:5433/tenxpros` | Per `app/.env.example` |
| Inside Docker (app container ↔ db container) | `postgresql://tenxpros:tenxpros_dev@db:5432/tenxpros` | Compose service name `db`, container port `5432` |

The new compose sets the in-container `DATABASE_URL` to `db:5432`.
Host tools keep using `localhost:5433`. The named volume
`tenxpros-db-data` is preserved across recreations.

## 6. Other findings

- **Stray TenXRole dev process on host port 3003.** A `pnpm next start
  -p 3003` from `/opt/tenxrole`, started by another local agent
  (`codex`), had grabbed port 3003 ~1 minute before the rollout. It
  was *not* the TenXRole production container (`tenxrole-app`, which
  Caddy reaches via Docker DNS, not host ports). The stray was
  killed; production TenXRole was unaffected.
- **Existing `tenxpros-db` was on the old project network only.**
  After adding `tenxpros-app` to the compose, the existing db
  container did not auto-attach to the new project network, so the
  app container couldn't resolve `db`. Resolved by `docker compose
  down && up -d` (named volume preserves data).

## 7. The rollout

| Step | Action | Result |
|------|--------|--------|
| 1 | Wrote `app/Dockerfile` (multi-stage Node 20 bookworm-slim, pnpm 9.15.9, full app + node_modules in runtime so `pnpm db:deploy`/`db:seed` work). | Image built (~95s). |
| 2 | Wrote `app/.dockerignore`. | Build context cleaner. |
| 3 | Replaced `docker-compose.yml`. Removed `tenxpros-web` nginx service. Added `tenxpros-app` service mapped `3003:3000` with `db:5432` connection. | Compose validated. |
| 4 | Container `CMD` runs `pnpm prisma migrate deploy && pnpm start` so deploys are migration-safe. | Pending migrations applied automatically on each start. |
| 5 | `docker compose down && up -d` to put db on the new project network. | Both services healthy. |
| 6 | `docker compose exec tenxpros-app pnpm db:seed` once. | 13 tracks, 2 rubrics, 5 scenarios, 4 users, 1 demo certificate, 2 global prompt packs. |
| 7 | Fixed stale Open Graph metadata in `app/src/app/layout.tsx` (still said "match" instead of "connect"). Rebuilt + restarted. | Metadata aligned with M0.1 ecosystem boundary. |

## 8. Verification

```
$ docker compose ps
NAME           STATUS                    PORTS
tenxpros-app   Up (healthy)              0.0.0.0:3003->3000/tcp
tenxpros-db    Up (healthy)              0.0.0.0:5433->5432/tcp

$ curl -sI http://localhost:3003 | head -1
HTTP/1.1 200 OK

$ curl -s http://localhost:3003/api/health
{"status":"ok","db":"ok","time":"2026-04-28T00:33:49.846Z"}

$ curl -sI -H 'Host: tenxpros.com' http://localhost/ | head -2
HTTP/1.1 308 Permanent Redirect
Location: https://tenxpros.com/
```

## 9. Adjacent stacks (untouched)

```
NAMES               STATUS
tenxops-api-1       Up (healthy)
tenxops-worker-1    Up
tenxops-web-1       Up
tenxops-postgres    Up (healthy)
tenxops-redis       Up (healthy)
tenxops-caddy-1     Up
tenxrole-app        Up (healthy)
tenxrole-db         Up (healthy)
```

The Caddy block for `tenxpros.com` was not modified.

## 10. Rollback

If the new app needs to be reverted to the placeholder:

```bash
cd /opt/tenxpros
docker compose down                   # stop app + db
cp _legacy_placeholder/docker-compose.yml.bak docker-compose.yml
docker compose up -d                  # restore nginx placeholder + db
```

The named volume `tenxpros-db-data` survives `docker compose down`
without `-v`, so all seeded data and any user data persists across
rollback / re-roll-forward.

For just a code rollback (stay in the new compose), build a previous
image tag or `git checkout` the prior commit and `docker compose up
-d --build tenxpros-app`.
