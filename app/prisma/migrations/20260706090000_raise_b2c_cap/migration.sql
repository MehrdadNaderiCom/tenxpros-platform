-- Raise the B2C per-deal cap from 25 percent to 28 percent (owner decision,
-- docs/phase1-b2c-cap-raise-plan.md). The ONLY commercial number that changes:
-- the B2B cap and the Tier 3 focus ceiling are untouched, and the growth bonus
-- stays inside the cap. Additive: a column default change plus a guarded,
-- idempotent update of the live singleton row (the row the engine pays from),
-- so the engine and every published surface flip together on container start.

-- AlterDefault (affects only a future re-creation of the singleton)
ALTER TABLE "ProgramConfig" ALTER COLUMN "capB2cBp" SET DEFAULT 2800;

-- Guarded data update: idempotent, and a deliberately different future value
-- would never be silently overwritten.
UPDATE "ProgramConfig"
SET "capB2cBp" = 2800, "updatedBy" = 'migration: raise B2C cap to 28 percent'
WHERE "id" = 'singleton' AND "capB2cBp" = 2500;
