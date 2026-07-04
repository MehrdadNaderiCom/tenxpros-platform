-- Make the ProgramConfig audit-trail correction durable for rebuilds.
--
-- Background: migration 20260706090000_raise_b2c_cap set capB2cBp = 2800 and
-- stamped updatedBy, but raw SQL bypasses Prisma's client-managed @updatedAt,
-- so the row could keep a timestamp OLDER than the change it claims. On the
-- live database this was corrected by hand on 2026-07-04; this migration makes
-- the same correction part of the chain so a rebuild cannot reproduce it.
-- The applied cap migration itself must not be edited (checksum-pinned).
--
-- Guard reasoning, scenario by scenario:
--  * Live database today: updatedAt already equals the cap raise's effective
--    moment (2026-07-04 00:01:51.698), so "updatedAt < threshold" is false and
--    this is a no-op. Running it again later is also a no-op (idempotent).
--  * Restore from a backup taken before the cap raise: the replayed cap
--    migration leaves the backup's old timestamp (e.g. 2026-06-27) on a row
--    that now claims the cap-raise updatedBy; that stale timestamp is older
--    than the threshold, so it is corrected to the cap raise's fixed effective
--    time. A fixed literal (not now()) keeps rebuilds deterministic.
--  * Fresh empty rebuild: the 20260627 migration creates the row at deploy
--    time, which is necessarily AFTER 2026-07-04, so the guard is false and
--    the newer, already-correct timestamp is never moved backwards.
--  * A later human edit: updatedBy no longer names the cap migration, so the
--    updatedBy guard is false and the newer edit is never touched.

UPDATE "ProgramConfig"
SET "updatedAt" = TIMESTAMP '2026-07-04 00:01:51.698'
WHERE "id" = 'singleton'
  AND "capB2cBp" = 2800
  AND "updatedBy" = 'migration: raise B2C cap to 28 percent'
  AND "updatedAt" < TIMESTAMP '2026-07-04 00:01:51.698';
