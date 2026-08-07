-- Keep this security migration all-or-nothing. PostgreSQL supports every DDL
-- operation below transactionally, so a failure cannot leave a half-hardened
-- schema that causes a production restart loop.
BEGIN;

-- Authorization freshness: additive fields preserve every existing account.
ALTER TABLE "User"
  ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspensionReason" TEXT;

-- Keep immutable actor attribution even if the optional live User relation is
-- later anonymized by its existing ON DELETE SET NULL contract.
ALTER TABLE "AuditLog"
  ADD COLUMN "actorUserIdSnapshot" TEXT,
  ADD COLUMN "actorEmailSnapshot" TEXT,
  ADD COLUMN "actorNameSnapshot" TEXT;

UPDATE "AuditLog" AS audit
SET
  "actorUserIdSnapshot" = audit."actorId",
  "actorEmailSnapshot" = actor."email",
  "actorNameSnapshot" = actor."name"
FROM "User" AS actor
WHERE actor."id" = audit."actorId";

-- Keep session invalidation correct even when identity changes originate from
-- a future code path, a maintenance script, or an administrative SQL client.
CREATE OR REPLACE FUNCTION "bump_user_auth_version"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."role" IS DISTINCT FROM NEW."role"
     OR OLD."email" IS DISTINCT FROM NEW."email"
     OR OLD."passwordHash" IS DISTINCT FROM NEW."passwordHash"
     OR OLD."isActive" IS DISTINCT FROM NEW."isActive"
     OR OLD."authVersion" IS DISTINCT FROM NEW."authVersion" THEN
    NEW."authVersion" := OLD."authVersion" + 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "User_bump_auth_version"
BEFORE UPDATE ON "User"
FOR EACH ROW
EXECUTE FUNCTION "bump_user_auth_version"();

ALTER TABLE "User"
  ADD CONSTRAINT "User_authVersion_nonnegative_check"
  CHECK ("authVersion" >= 0);

-- Credential validity is separate from public/private visibility.
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'REVOKED');

ALTER TABLE "ParticipantBadge"
  ADD COLUMN "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "revocationReason" TEXT;

-- Freeze the clawback policy on each deal. For historical deals, use the
-- partner override that exists at migration time, then the global program
-- value, and finally the contractual default as a defensive fallback.
ALTER TABLE "ClosedDeal"
  ADD COLUMN "clawbackDaysAtClose" INTEGER,
  ADD COLUMN "clawbackWindowEndsAt" TIMESTAMP(3),
  ADD COLUMN "underlyingRefundWindowEndsAt" TIMESTAMP(3);

UPDATE "ClosedDeal" AS deal
SET
  "clawbackDaysAtClose" = COALESCE(
    (SELECT cfg."clawbackDays" FROM "PartnerConfig" AS cfg WHERE cfg."partnerId" = deal."partnerId"),
    (SELECT program."clawbackDays" FROM "ProgramConfig" AS program WHERE program."id" = 'singleton'),
    120
  ),
  "clawbackWindowEndsAt" = COALESCE(deal."signedAt", deal."createdAt")
    + make_interval(days => COALESCE(
        (SELECT cfg."clawbackDays" FROM "PartnerConfig" AS cfg WHERE cfg."partnerId" = deal."partnerId"),
        (SELECT program."clawbackDays" FROM "ProgramConfig" AS program WHERE program."id" = 'singleton'),
        120
      ));

ALTER TABLE "ClosedDeal"
  ALTER COLUMN "clawbackDaysAtClose" SET NOT NULL,
  ALTER COLUMN "clawbackDaysAtClose" SET DEFAULT 120,
  ALTER COLUMN "clawbackWindowEndsAt" SET NOT NULL,
  ALTER COLUMN "clawbackWindowEndsAt" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '120 days');

ALTER TABLE "ProgramConfig"
  ADD CONSTRAINT "ProgramConfig_clawbackDays_nonnegative_check"
  CHECK ("clawbackDays" >= 0) NOT VALID;

ALTER TABLE "PartnerConfig"
  ADD CONSTRAINT "PartnerConfig_clawbackDays_nonnegative_check"
  CHECK ("clawbackDays" IS NULL OR "clawbackDays" >= 0) NOT VALID;

ALTER TABLE "ClosedDeal"
  ADD CONSTRAINT "ClosedDeal_clawbackDays_nonnegative_check"
  CHECK ("clawbackDaysAtClose" >= 0) NOT VALID,
  ADD CONSTRAINT "ClosedDeal_netReceiptsCents_nonnegative_check"
  CHECK ("netReceiptsCents" >= 0) NOT VALID,
  ADD CONSTRAINT "ClosedDeal_clawbackWindow_order_check"
  CHECK ("clawbackWindowEndsAt" >= COALESCE("signedAt", "createdAt")) NOT VALID,
  ADD CONSTRAINT "ClosedDeal_underlyingWindow_order_check"
  CHECK (
    "underlyingRefundWindowEndsAt" IS NULL
    OR "clawbackWindowEndsAt" >= "underlyingRefundWindowEndsAt"
  ) NOT VALID,
  ADD CONSTRAINT "ClosedDeal_clawbackWindow_policy_check"
  CHECK (
    "clawbackWindowEndsAt" = GREATEST(
      COALESCE("signedAt", "createdAt") + make_interval(days => "clawbackDaysAtClose"),
      "underlyingRefundWindowEndsAt"
    )
  ) NOT VALID;

ALTER TABLE "ProgramConfig" VALIDATE CONSTRAINT "ProgramConfig_clawbackDays_nonnegative_check";
ALTER TABLE "PartnerConfig" VALIDATE CONSTRAINT "PartnerConfig_clawbackDays_nonnegative_check";
ALTER TABLE "ClosedDeal" VALIDATE CONSTRAINT "ClosedDeal_clawbackDays_nonnegative_check";
ALTER TABLE "ClosedDeal" VALIDATE CONSTRAINT "ClosedDeal_netReceiptsCents_nonnegative_check";
ALTER TABLE "ClosedDeal" VALIDATE CONSTRAINT "ClosedDeal_clawbackWindow_order_check";
ALTER TABLE "ClosedDeal" VALIDATE CONSTRAINT "ClosedDeal_underlyingWindow_order_check";
ALTER TABLE "ClosedDeal" VALIDATE CONSTRAINT "ClosedDeal_clawbackWindow_policy_check";

-- Existing refund rows remain untouched; the snapshot fields are backfilled
-- from their deal. New writes always include an idempotency key and fingerprint.
ALTER TABLE "RefundEvent"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "sourceReference" TEXT,
  ADD COLUMN "requestFingerprint" TEXT,
  ADD COLUMN "clawbackDaysAtEvent" INTEGER,
  ADD COLUMN "clawbackWindowEndsAt" TIMESTAMP(3),
  ADD COLUMN "seatsRefunded" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "initiatedByUserId" TEXT,
  ADD COLUMN "cumulativeRefundedCentsAfter" INTEGER,
  ADD COLUMN "cumulativeEligibleCentsAfter" INTEGER;

UPDATE "RefundEvent" AS refund
SET
  "clawbackDaysAtEvent" = deal."clawbackDaysAtClose",
  "clawbackWindowEndsAt" = deal."clawbackWindowEndsAt"
FROM "ClosedDeal" AS deal
WHERE deal."id" = refund."closedDealId";

CREATE UNIQUE INDEX "RefundEvent_idempotencyKey_key"
ON "RefundEvent"("idempotencyKey");

-- Immutable per-commission allocation ledger. RESTRICT prevents a refund or
-- commission row with financial history from being silently cascade-deleted.
CREATE TABLE "CommissionClawbackAllocation" (
  "id" TEXT NOT NULL,
  "refundEventId" TEXT NOT NULL,
  "commissionEntryId" TEXT NOT NULL,
  "deltaCents" INTEGER NOT NULL,
  "reversedBeforeCents" INTEGER NOT NULL,
  "reversedAfterCents" INTEGER NOT NULL,
  "statusBefore" "CommissionStatus" NOT NULL,
  "statusAfter" "CommissionStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CommissionClawbackAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClawbackAllocation_refund_commission_key"
ON "CommissionClawbackAllocation"("refundEventId", "commissionEntryId");

CREATE INDEX "CommissionClawbackAllocation_commissionEntryId_createdAt_idx"
ON "CommissionClawbackAllocation"("commissionEntryId", "createdAt");

-- A commission's allocations form one monotonic chain. These keys prevent a
-- reversal point from forking or merging into multiple purported histories.
CREATE UNIQUE INDEX "ClawbackAllocation_commission_before_key"
ON "CommissionClawbackAllocation"("commissionEntryId", "reversedBeforeCents");

CREATE UNIQUE INDEX "ClawbackAllocation_commission_after_key"
ON "CommissionClawbackAllocation"("commissionEntryId", "reversedAfterCents");

ALTER TABLE "CommissionClawbackAllocation"
  ADD CONSTRAINT "CommissionClawbackAllocation_refundEventId_fkey"
  FOREIGN KEY ("refundEventId") REFERENCES "RefundEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CommissionClawbackAllocation_commissionEntryId_fkey"
  FOREIGN KEY ("commissionEntryId") REFERENCES "CommissionEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Immutable, row-level proof of every seat movement caused by a RefundEvent.
-- It supports repeated partial refunds while preventing an unrelated writer
-- from manufacturing, deleting, or rewriting post-refund seat state.
CREATE TABLE "SeatRefundAllocation" (
  "id" TEXT NOT NULL,
  "refundEventId" TEXT NOT NULL,
  "sourceSeatRecordId" TEXT NOT NULL,
  "refundedSeatRecordId" TEXT NOT NULL,
  "deltaSeats" INTEGER NOT NULL,
  "sourceCountBefore" INTEGER NOT NULL,
  "sourceCountAfter" INTEGER NOT NULL,
  "sourceStatusBefore" "SeatStatus" NOT NULL,
  "sourceStatusAfter" "SeatStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SeatRefundAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeatRefundAllocation_refund_source_key"
ON "SeatRefundAllocation"("refundEventId", "sourceSeatRecordId");

CREATE UNIQUE INDEX "SeatRefundAllocation_refunded_seat_key"
ON "SeatRefundAllocation"("refundedSeatRecordId");

CREATE UNIQUE INDEX "SeatRefundAllocation_source_before_key"
ON "SeatRefundAllocation"("sourceSeatRecordId", "sourceCountBefore", "sourceStatusBefore");

CREATE INDEX "SeatRefundAllocation_sourceSeatRecordId_createdAt_idx"
ON "SeatRefundAllocation"("sourceSeatRecordId", "createdAt");

CREATE INDEX "SeatRefundAllocation_refundEventId_createdAt_idx"
ON "SeatRefundAllocation"("refundEventId", "createdAt");

ALTER TABLE "SeatRefundAllocation"
  ADD CONSTRAINT "SeatRefundAllocation_refundEventId_fkey"
  FOREIGN KEY ("refundEventId") REFERENCES "RefundEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SeatRefundAllocation_sourceSeatRecordId_fkey"
  FOREIGN KEY ("sourceSeatRecordId") REFERENCES "SeatRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SeatRefundAllocation_refundedSeatRecordId_fkey"
  FOREIGN KEY ("refundedSeatRecordId") REFERENCES "SeatRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SeatRefundAllocation"
  ADD CONSTRAINT "SeatRefundAllocation_shape_check"
  CHECK (
    "deltaSeats" > 0
    AND "sourceCountBefore" > 0
    AND "sourceCountAfter" > 0
    AND (
      (
        "sourceSeatRecordId" = "refundedSeatRecordId"
        AND "sourceCountBefore" = "sourceCountAfter"
        AND "deltaSeats" = "sourceCountBefore"
        AND "sourceStatusBefore" = 'PAID_COLLECTED'
        AND "sourceStatusAfter" = 'REFUNDED'
      )
      OR
      (
        "sourceSeatRecordId" <> "refundedSeatRecordId"
        AND "sourceCountBefore" > "sourceCountAfter"
        AND "deltaSeats" = "sourceCountBefore" - "sourceCountAfter"
        AND "sourceStatusBefore" = 'PAID_COLLECTED'
        AND "sourceStatusAfter" = 'PAID_COLLECTED'
      )
    )
  );

-- A deal, refund, or allocation is an append-only financial fact. Commission
-- lines may advance through their audited lifecycle, but they can never be
-- deleted. Restrictive foreign keys also protect refund events that happen
-- outside the clawback window and therefore have no allocation rows.
ALTER TABLE "CommissionEntry"
  DROP CONSTRAINT "CommissionEntry_closedDealId_fkey",
  ADD CONSTRAINT "CommissionEntry_closedDealId_fkey"
  FOREIGN KEY ("closedDealId") REFERENCES "ClosedDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- These two relations were also Cascade in the original partner-program
-- migration. The Prisma schema now says Restrict, and the database must agree:
-- deleting a Partner must never erase a deal or commission ledger transitively.
ALTER TABLE "ClosedDeal"
  DROP CONSTRAINT "ClosedDeal_partnerId_fkey",
  ADD CONSTRAINT "ClosedDeal_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommissionEntry"
  DROP CONSTRAINT "CommissionEntry_partnerId_fkey",
  ADD CONSTRAINT "CommissionEntry_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RefundEvent"
  DROP CONSTRAINT "RefundEvent_closedDealId_fkey",
  ADD CONSTRAINT "RefundEvent_closedDealId_fkey"
  FOREIGN KEY ("closedDealId") REFERENCES "ClosedDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "reject_financial_ledger_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is an immutable financial ledger table; % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '55000';
END;
$$;

-- Audit payloads are append-only. The one narrow UPDATE exception preserves
-- the existing User hard-delete contract: its FK anonymizes actorId with
-- ON DELETE SET NULL while every recorded fact remains byte-for-byte intact.
CREATE OR REPLACE FUNCTION "guard_audit_log_append_only"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_email TEXT;
  actor_name TEXT;
  actor_role TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."actorId" IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT actor."email", actor."name", actor."role"::TEXT
    INTO actor_email, actor_name, actor_role
    FROM "User" actor
    WHERE actor."id" = NEW."actorId";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'AuditLog actor % does not exist', NEW."actorId"
        USING ERRCODE = '23503';
    END IF;

    NEW."actorUserIdSnapshot" := NEW."actorId";
    NEW."actorEmailSnapshot" := actor_email;
    NEW."actorNameSnapshot" := actor_name;
    NEW."actorRole" := actor_role;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD."actorId" IS NOT NULL
     AND NEW."actorId" IS NULL
     AND (to_jsonb(NEW) - 'actorId') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'actorId') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'AuditLog is append-only; % is not allowed', TG_OP
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "AuditLog_append_only"
BEFORE INSERT OR UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION "guard_audit_log_append_only"();

-- ClosedDeal identity, money and policy snapshots remain immutable. Delivery
-- and payment clearance are real-world facts that may occur after the initial
-- close, so they are the only set-once lifecycle transitions permitted. Prisma
-- maintains updatedAt automatically; conversionDate may be filled exactly once
-- and only with the payment-clearance instant.
CREATE OR REPLACE FUNCTION "enforce_closed_deal_immutability"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ClosedDeal is an immutable financial ledger table; DELETE is not allowed'
      USING ERRCODE = '55000';
  END IF;

  IF (to_jsonb(NEW) - 'deliveredAt' - 'paymentClearedAt' - 'conversionDate' - 'updatedAt')
       IS DISTINCT FROM
     (to_jsonb(OLD) - 'deliveredAt' - 'paymentClearedAt' - 'conversionDate' - 'updatedAt') THEN
    RAISE EXCEPTION 'ClosedDeal identity, amount, currency and policy snapshots are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF (
       NEW."deliveredAt" IS DISTINCT FROM OLD."deliveredAt" OR
       NEW."paymentClearedAt" IS DISTINCT FROM OLD."paymentClearedAt" OR
       NEW."conversionDate" IS DISTINCT FROM OLD."conversionDate"
     ) AND EXISTS (
       SELECT 1 FROM "RefundEvent" refund
       WHERE refund."closedDealId" = OLD."id"
     ) THEN
    RAISE EXCEPTION 'ClosedDeal milestones are frozen after refund activity'
      USING ERRCODE = '55000';
  END IF;

  IF OLD."deliveredAt" IS NOT NULL AND NEW."deliveredAt" IS DISTINCT FROM OLD."deliveredAt" THEN
    RAISE EXCEPTION 'ClosedDeal delivery date is set-once and cannot be changed'
      USING ERRCODE = '55000';
  END IF;
  IF OLD."paymentClearedAt" IS NOT NULL AND NEW."paymentClearedAt" IS DISTINCT FROM OLD."paymentClearedAt" THEN
    RAISE EXCEPTION 'ClosedDeal payment-clearance date is set-once and cannot be changed'
      USING ERRCODE = '55000';
  END IF;
  IF NEW."conversionDate" IS DISTINCT FROM OLD."conversionDate" AND (
    OLD."conversionDate" IS NOT NULL OR
    NEW."paymentClearedAt" IS NULL OR
    NEW."conversionDate" IS DISTINCT FROM NEW."paymentClearedAt"
  ) THEN
    RAISE EXCEPTION 'ClosedDeal conversion date may only be filled once from payment clearance'
      USING ERRCODE = '55000';
  END IF;
  IF OLD."paymentClearedAt" IS NULL AND NEW."paymentClearedAt" IS NOT NULL
     AND OLD."conversionDate" IS NULL
     AND NEW."conversionDate" IS DISTINCT FROM NEW."paymentClearedAt" THEN
    RAISE EXCEPTION 'ClosedDeal payment clearance must set its matching conversion date'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "ClosedDeal_immutable"
BEFORE UPDATE OR DELETE ON "ClosedDeal"
FOR EACH ROW EXECUTE FUNCTION "enforce_closed_deal_immutability"();

ALTER TABLE "SeatRecord"
  ADD CONSTRAINT "SeatRecord_count_positive_check"
  CHECK ("count" > 0) NOT VALID;

ALTER TABLE "SeatRecord" VALIDATE CONSTRAINT "SeatRecord_count_positive_check";

-- Every seat write shares the same deal lock as refunds and commissions. A
-- deferred allocation check below distinguishes legitimate repeated refund
-- movements from unrelated post-refund mutations without weakening races.
CREATE OR REPLACE FUNCTION "guard_seat_record_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_deal_id TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."closedDealId" IS DISTINCT FROM OLD."closedDealId" THEN
    RAISE EXCEPTION 'SeatRecord closedDealId is immutable'
      USING ERRCODE = '55000';
  END IF;

  target_deal_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."closedDealId" ELSE NEW."closedDealId" END;

  PERFORM 1
  FROM "ClosedDeal"
  WHERE "id" = target_deal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ClosedDeal % does not exist', target_deal_id
      USING ERRCODE = '23503';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "SeatRecord_guard_mutation"
BEFORE INSERT OR UPDATE OR DELETE ON "SeatRecord"
FOR EACH ROW EXECUTE FUNCTION "guard_seat_record_mutation"();

CREATE TRIGGER "RefundEvent_immutable"
BEFORE UPDATE OR DELETE ON "RefundEvent"
FOR EACH ROW EXECUTE FUNCTION "reject_financial_ledger_mutation"();

CREATE TRIGGER "CommissionClawbackAllocation_immutable"
BEFORE UPDATE OR DELETE ON "CommissionClawbackAllocation"
FOR EACH ROW EXECUTE FUNCTION "reject_financial_ledger_mutation"();

CREATE TRIGGER "SeatRefundAllocation_immutable"
BEFORE UPDATE OR DELETE ON "SeatRefundAllocation"
FOR EACH ROW EXECUTE FUNCTION "reject_financial_ledger_mutation"();

CREATE TRIGGER "CommissionEntry_prevent_delete"
BEFORE DELETE ON "CommissionEntry"
FOR EACH ROW EXECUTE FUNCTION "reject_financial_ledger_mutation"();

-- Every new commission line starts as an unreversed accrual. Lifecycle and
-- reversal state must be reached only through the guarded UPDATE path below.
-- The deal row is also the shared serialization point for commission and
-- refund writes, so a raw/future insert cannot add a line after refund history
-- has made the deal's downstream ledger final.
CREATE OR REPLACE FUNCTION "guard_commission_entry_insert"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."status" <> 'ACCRUED'
     OR NEW."reversedCents" <> 0
     OR NEW."paidOn" IS NOT NULL THEN
    RAISE EXCEPTION 'A new CommissionEntry must start as an unpaid, unreversed ACCRUED line'
      USING ERRCODE = '23514';
  END IF;

  PERFORM 1
  FROM "ClosedDeal"
  WHERE "id" = NEW."closedDealId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ClosedDeal % does not exist', NEW."closedDealId"
      USING ERRCODE = '23503';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "RefundEvent" refund
    WHERE refund."closedDealId" = NEW."closedDealId"
  ) THEN
    RAISE EXCEPTION 'CommissionEntry lines cannot be added after refund activity'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "CommissionEntry_guard_insert"
BEFORE INSERT ON "CommissionEntry"
FOR EACH ROW EXECUTE FUNCTION "guard_commission_entry_insert"();

-- Commission lines have a small, explicit mutable surface. Provenance and
-- identity are always immutable. The calculation fields may be finalized by
-- the existing recompute workflow only before any refund/allocation exists and
-- before settlement. Lifecycle transitions are forward-only; refund reversal
-- is monotonic and must later be backed by an allocation in the same transaction.
CREATE OR REPLACE FUNCTION "guard_commission_entry_update"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  calculation_changed BOOLEAN :=
       OLD."rateBp" IS DISTINCT FROM NEW."rateBp"
    OR OLD."amountCents" IS DISTINCT FROM NEW."amountCents"
    OR OLD."payableOn" IS DISTINCT FROM NEW."payableOn";
  reversal_changed BOOLEAN := OLD."reversedCents" IS DISTINCT FROM NEW."reversedCents";
BEGIN
  -- Whitelist the only fields that current workflows legitimately update.
  -- Removing the whitelist from each row comparison also makes future columns
  -- fail closed until their mutability is considered explicitly.
  IF (to_jsonb(OLD) - ARRAY[
        'rateBp', 'amountCents', 'payableOn',
        'reversedCents', 'status', 'paidOn',
        'queryFlag', 'queryNote', 'updatedAt'
      ]) IS DISTINCT FROM
     (to_jsonb(NEW) - ARRAY[
        'rateBp', 'amountCents', 'payableOn',
        'reversedCents', 'status', 'paidOn',
        'queryFlag', 'queryNote', 'updatedAt'
      ]) THEN
    RAISE EXCEPTION 'CommissionEntry identity and provenance fields are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF calculation_changed THEN
    IF OLD."status" IN ('PAID', 'REVERSED')
       OR NEW."status" IS DISTINCT FROM OLD."status"
       OR reversal_changed
       OR EXISTS (
         SELECT 1 FROM "RefundEvent" refund
         WHERE refund."closedDealId" = OLD."closedDealId"
       )
       OR EXISTS (
         SELECT 1 FROM "CommissionClawbackAllocation" allocation
         WHERE allocation."commissionEntryId" = OLD."id"
       ) THEN
      RAISE EXCEPTION 'CommissionEntry calculation fields are frozen after settlement or refund activity'
        USING ERRCODE = '55000';
    END IF;
  END IF;

  IF NEW."reversedCents" < OLD."reversedCents" THEN
    RAISE EXCEPTION 'CommissionEntry reversedCents cannot decrease'
      USING ERRCODE = '23514';
  END IF;

  IF reversal_changed THEN
    IF calculation_changed THEN
      RAISE EXCEPTION 'CommissionEntry calculation and reversal fields cannot change together'
        USING ERRCODE = '55000';
    END IF;

    IF NEW."reversedCents" = NEW."amountCents" THEN
      IF NEW."status" <> 'REVERSED' THEN
        RAISE EXCEPTION 'A fully reversed CommissionEntry must have REVERSED status'
          USING ERRCODE = '23514';
      END IF;
    ELSIF NEW."status" IS DISTINCT FROM OLD."status" THEN
      RAISE EXCEPTION 'A partial reversal cannot change CommissionEntry status'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW."status" IS DISTINCT FROM OLD."status" THEN
    IF OLD."status" = 'ACCRUED' AND NEW."status" = 'PAYABLE' AND NOT reversal_changed THEN
      NULL;
    ELSIF OLD."status" = 'PAYABLE' AND NEW."status" = 'PAID'
          AND NOT reversal_changed AND NEW."paidOn" IS NOT NULL THEN
      NULL;
    ELSIF NEW."status" = 'REVERSED'
          AND NEW."reversedCents" > OLD."reversedCents"
          AND NEW."reversedCents" = NEW."amountCents" THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Invalid CommissionEntry status transition: % to %', OLD."status", NEW."status"
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF OLD."paidOn" IS DISTINCT FROM NEW."paidOn"
     AND NOT (
       OLD."status" = 'PAYABLE'
       AND NEW."status" = 'PAID'
       AND OLD."paidOn" IS NULL
       AND NEW."paidOn" IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'CommissionEntry paidOn may only be set on PAYABLE to PAID transition'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "CommissionEntry_guard_update"
BEFORE UPDATE ON "CommissionEntry"
FOR EACH ROW EXECUTE FUNCTION "guard_commission_entry_update"();

ALTER TABLE "CommissionEntry"
  ADD CONSTRAINT "CommissionEntry_reversedCents_bounds_check"
  CHECK ("reversedCents" >= 0 AND "reversedCents" <= "amountCents") NOT VALID;

ALTER TABLE "CommissionEntry" VALIDATE CONSTRAINT "CommissionEntry_reversedCents_bounds_check";

ALTER TABLE "RefundEvent"
  ADD CONSTRAINT "RefundEvent_amountCents_nonnegative_check"
  CHECK ("amountCents" >= 0) NOT VALID,
  ADD CONSTRAINT "RefundEvent_seatsRefunded_nonnegative_check"
  CHECK ("seatsRefunded" >= 0) NOT VALID;

ALTER TABLE "RefundEvent" VALIDATE CONSTRAINT "RefundEvent_amountCents_nonnegative_check";
ALTER TABLE "RefundEvent" VALIDATE CONSTRAINT "RefundEvent_seatsRefunded_nonnegative_check";

ALTER TABLE "CommissionClawbackAllocation"
  ADD CONSTRAINT "ClawbackAllocation_delta_positive_check"
  CHECK ("deltaCents" > 0),
  ADD CONSTRAINT "ClawbackAllocation_reversal_progress_check"
  CHECK (
    "reversedBeforeCents" >= 0
    AND "reversedAfterCents" > "reversedBeforeCents"
    AND "deltaCents" = "reversedAfterCents" - "reversedBeforeCents"
  );

-- Nullable columns preserve deterministic migration of historical refund rows,
-- but every row inserted after this migration must carry complete provenance
-- and exact policy/cumulative snapshots. Locking the deal here makes even a
-- direct SQL insert serialize with the application's financial transaction.
CREATE OR REPLACE FUNCTION "guard_refund_event_insert"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  deal "ClosedDeal"%ROWTYPE;
  prior_refunded BIGINT;
  prior_eligible BIGINT;
BEGIN
  IF NEW."idempotencyKey" IS NULL
     OR NEW."idempotencyKey" !~ '^[0-9a-f]{64}$'
     OR NEW."sourceReference" IS NULL
     OR char_length(btrim(NEW."sourceReference")) < 4
     OR char_length(btrim(NEW."sourceReference")) > 160
     OR NEW."sourceReference" ~ '[[:cntrl:]]'
     OR NEW."requestFingerprint" IS NULL
     OR NEW."requestFingerprint" !~ '^[0-9a-f]{64}$'
     OR NEW."clawbackDaysAtEvent" IS NULL
     OR NEW."clawbackWindowEndsAt" IS NULL
     OR NEW."initiatedByUserId" IS NULL
     OR btrim(NEW."initiatedByUserId") = ''
     OR NEW."cumulativeRefundedCentsAfter" IS NULL
     OR NEW."cumulativeEligibleCentsAfter" IS NULL THEN
    RAISE EXCEPTION 'New RefundEvent rows require complete idempotency, actor, policy, and cumulative provenance'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "User" actor
    WHERE actor."id" = NEW."initiatedByUserId"
  ) THEN
    RAISE EXCEPTION 'RefundEvent initiatedByUserId must identify a current User at event time'
      USING ERRCODE = '23503';
  END IF;

  SELECT * INTO deal
  FROM "ClosedDeal"
  WHERE "id" = NEW."closedDealId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ClosedDeal % does not exist', NEW."closedDealId"
      USING ERRCODE = '23503';
  END IF;

  IF NEW."clawbackDaysAtEvent" IS DISTINCT FROM deal."clawbackDaysAtClose"
     OR NEW."clawbackWindowEndsAt" IS DISTINCT FROM deal."clawbackWindowEndsAt" THEN
    RAISE EXCEPTION 'RefundEvent clawback policy must match the immutable ClosedDeal snapshot'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."withinWindow" IS DISTINCT FROM (NEW."occurredAt" <= deal."clawbackWindowEndsAt") THEN
    RAISE EXCEPTION 'RefundEvent withinWindow does not match its snapshotted event time'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."occurredAt" < COALESCE(deal."signedAt", deal."createdAt")
     OR NEW."occurredAt" > CURRENT_TIMESTAMP + INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'RefundEvent occurredAt is outside the valid deal timeline'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."amountCents" = 0 AND NEW."seatsRefunded" = 0 THEN
    RAISE EXCEPTION 'RefundEvent must refund money or at least one seat'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."reversedCommissionCents" < 0
     OR (NOT NEW."withinWindow" AND NEW."reversedCommissionCents" <> 0) THEN
    RAISE EXCEPTION 'RefundEvent reversal amount is invalid for its clawback window'
      USING ERRCODE = '23514';
  END IF;

  SELECT
    COALESCE(SUM(refund."amountCents"), 0),
    COALESCE(SUM(refund."amountCents") FILTER (WHERE refund."withinWindow"), 0)
  INTO prior_refunded, prior_eligible
  FROM "RefundEvent" refund
  WHERE refund."closedDealId" = NEW."closedDealId";

  IF NEW."cumulativeRefundedCentsAfter" <> prior_refunded + NEW."amountCents"
     OR NEW."cumulativeRefundedCentsAfter" > deal."netReceiptsCents" THEN
    RAISE EXCEPTION 'RefundEvent cumulative refunded amount is inconsistent with its deal ledger'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."cumulativeEligibleCentsAfter" < 0
     OR NEW."cumulativeEligibleCentsAfter" <> prior_eligible
        + (CASE WHEN NEW."withinWindow" THEN NEW."amountCents" ELSE 0 END) THEN
    RAISE EXCEPTION 'RefundEvent cumulative eligible amount is inconsistent with its deal ledger'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "RefundEvent_guard_insert"
BEFORE INSERT ON "RefundEvent"
FOR EACH ROW EXECUTE FUNCTION "guard_refund_event_insert"();

-- The application updates CommissionEntry before it appends the event and
-- allocation rows. Deferred checks validate the complete transaction at commit
-- without forcing a less-safe multi-transaction write order.
CREATE OR REPLACE FUNCTION "verify_commission_reversal_allocation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "CommissionClawbackAllocation" allocation
    WHERE allocation."commissionEntryId" = NEW."id"
      AND allocation."reversedBeforeCents" = OLD."reversedCents"
      AND allocation."reversedAfterCents" = NEW."reversedCents"
      AND allocation."deltaCents" = NEW."reversedCents" - OLD."reversedCents"
      AND allocation."statusBefore" = OLD."status"
      AND allocation."statusAfter" = NEW."status"
  ) THEN
    RAISE EXCEPTION 'CommissionEntry reversal requires a matching immutable allocation'
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "CommissionEntry_reversal_has_allocation"
AFTER UPDATE OF "reversedCents" ON "CommissionEntry"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
WHEN (OLD."reversedCents" IS DISTINCT FROM NEW."reversedCents")
EXECUTE FUNCTION "verify_commission_reversal_allocation"();

CREATE OR REPLACE FUNCTION "verify_refund_allocation_total"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  allocated BIGINT;
  deal_net_receipts INTEGER;
  commission_row RECORD;
  event_allocation RECORD;
  proportional_target BIGINT;
BEGIN
  SELECT COALESCE(SUM(allocation."deltaCents"), 0)
  INTO allocated
  FROM "CommissionClawbackAllocation" allocation
  WHERE allocation."refundEventId" = NEW."id";

  IF allocated <> NEW."reversedCommissionCents" THEN
    RAISE EXCEPTION 'RefundEvent reversal total requires matching immutable allocations'
      USING ERRCODE = '23514';
  END IF;

  SELECT deal."netReceiptsCents"
  INTO deal_net_receipts
  FROM "ClosedDeal" deal
  WHERE deal."id" = NEW."closedDealId";

  IF NEW."withinWindow" THEN
    FOR commission_row IN
      SELECT commission."id", commission."amountCents", commission."reversedCents"
      FROM "CommissionEntry" commission
      WHERE commission."closedDealId" = NEW."closedDealId"
    LOOP
      proportional_target := CASE
        WHEN deal_net_receipts > 0 THEN
          ROUND(
            commission_row."amountCents"::NUMERIC
            * NEW."cumulativeEligibleCentsAfter"::NUMERIC
            / deal_net_receipts::NUMERIC
          )::BIGINT
        ELSE 0
      END;

      SELECT
        allocation."reversedBeforeCents",
        allocation."reversedAfterCents",
        allocation."deltaCents"
      INTO event_allocation
      FROM "CommissionClawbackAllocation" allocation
      WHERE allocation."refundEventId" = NEW."id"
        AND allocation."commissionEntryId" = commission_row."id";

      IF FOUND THEN
        IF event_allocation."reversedAfterCents"
             <> GREATEST(event_allocation."reversedBeforeCents", proportional_target)
           OR event_allocation."deltaCents"
             <> event_allocation."reversedAfterCents" - event_allocation."reversedBeforeCents" THEN
          RAISE EXCEPTION 'RefundEvent commission allocation does not match the proportional clawback target'
            USING ERRCODE = '23514';
        END IF;
      ELSIF commission_row."reversedCents" < proportional_target THEN
        RAISE EXCEPTION 'RefundEvent is missing a required proportional commission allocation'
          USING ERRCODE = '23514';
      END IF;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "RefundEvent_allocation_total"
AFTER INSERT ON "RefundEvent"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "verify_refund_allocation_total"();

CREATE OR REPLACE FUNCTION "verify_clawback_allocation_consistency"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  event_deal_id TEXT;
  event_reversed INTEGER;
  event_allocated BIGINT;
  commission_deal_id TEXT;
  commission_amount INTEGER;
  commission_reversed INTEGER;
  commission_status "CommissionStatus";
  chain_starts BIGINT;
  chain_ends BIGINT;
  terminal_after INTEGER;
  terminal_status "CommissionStatus";
BEGIN
  SELECT refund."closedDealId", refund."reversedCommissionCents"
  INTO event_deal_id, event_reversed
  FROM "RefundEvent" refund
  WHERE refund."id" = NEW."refundEventId";

  SELECT
    commission."closedDealId",
    commission."amountCents",
    commission."reversedCents",
    commission."status"
  INTO commission_deal_id, commission_amount, commission_reversed, commission_status
  FROM "CommissionEntry" commission
  WHERE commission."id" = NEW."commissionEntryId";

  IF event_deal_id IS DISTINCT FROM commission_deal_id THEN
    RAISE EXCEPTION 'A clawback allocation must link a refund and commission from the same ClosedDeal'
      USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(SUM(allocation."deltaCents"), 0)
  INTO event_allocated
  FROM "CommissionClawbackAllocation" allocation
  WHERE allocation."refundEventId" = NEW."refundEventId";

  IF event_allocated IS DISTINCT FROM event_reversed THEN
    RAISE EXCEPTION 'A RefundEvent allocation sum must match its immutable reversal total'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."reversedAfterCents" > commission_amount THEN
    RAISE EXCEPTION 'A clawback allocation cannot reverse more than its CommissionEntry amount'
      USING ERRCODE = '23514';
  END IF;

  SELECT COUNT(*)
  INTO chain_starts
  FROM "CommissionClawbackAllocation" allocation
  WHERE allocation."commissionEntryId" = NEW."commissionEntryId"
    AND NOT EXISTS (
      SELECT 1
      FROM "CommissionClawbackAllocation" predecessor
      WHERE predecessor."commissionEntryId" = allocation."commissionEntryId"
        AND predecessor."reversedAfterCents" = allocation."reversedBeforeCents"
    );

  SELECT COUNT(*)
  INTO chain_ends
  FROM "CommissionClawbackAllocation" allocation
  WHERE allocation."commissionEntryId" = NEW."commissionEntryId"
    AND NOT EXISTS (
      SELECT 1
      FROM "CommissionClawbackAllocation" successor
      WHERE successor."commissionEntryId" = allocation."commissionEntryId"
        AND successor."reversedBeforeCents" = allocation."reversedAfterCents"
    );

  IF chain_starts <> 1 OR chain_ends <> 1 THEN
    RAISE EXCEPTION 'CommissionEntry clawback allocations must form one contiguous reversal chain'
      USING ERRCODE = '23514';
  END IF;

  SELECT allocation."reversedAfterCents", allocation."statusAfter"
  INTO terminal_after, terminal_status
  FROM "CommissionClawbackAllocation" allocation
  WHERE allocation."commissionEntryId" = NEW."commissionEntryId"
    AND NOT EXISTS (
      SELECT 1
      FROM "CommissionClawbackAllocation" successor
      WHERE successor."commissionEntryId" = allocation."commissionEntryId"
        AND successor."reversedBeforeCents" = allocation."reversedAfterCents"
    );

  IF terminal_after IS DISTINCT FROM commission_reversed
     OR terminal_status IS DISTINCT FROM commission_status THEN
    RAISE EXCEPTION 'Clawback allocation terminal state must match its CommissionEntry reversal state'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "ClawbackAllocation_consistency"
AFTER INSERT ON "CommissionClawbackAllocation"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "verify_clawback_allocation_consistency"();

CREATE OR REPLACE FUNCTION "verify_seat_record_refund_allocation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_deal_id TEXT;
BEGIN
  target_deal_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."closedDealId" ELSE NEW."closedDealId" END;

  -- Before the first refund, ordinary audited seat administration remains
  -- available. Once a refund exists (including one appended later in this same
  -- transaction), every current mutation must prove its refund allocation.
  IF NOT EXISTS (
    SELECT 1 FROM "RefundEvent" refund
    WHERE refund."closedDealId" = target_deal_id
  ) THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'SeatRecord cannot be deleted after refund activity'
      USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'REFUNDED'
       OR NOT EXISTS (
         SELECT 1
         FROM "SeatRefundAllocation" allocation
         JOIN "RefundEvent" refund ON refund."id" = allocation."refundEventId"
         WHERE allocation."refundedSeatRecordId" = NEW."id"
           AND allocation."sourceSeatRecordId" <> NEW."id"
           AND allocation."deltaSeats" = NEW."count"
           AND refund."closedDealId" = NEW."closedDealId"
       ) THEN
      RAISE EXCEPTION 'A post-refund SeatRecord insert requires a matching immutable split allocation'
        USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
  END IF;

  IF (to_jsonb(OLD) - ARRAY['count', 'status', 'updatedAt']) IS DISTINCT FROM
     (to_jsonb(NEW) - ARRAY['count', 'status', 'updatedAt']) THEN
    RAISE EXCEPTION 'Refund-linked SeatRecord updates may only change count or status'
      USING ERRCODE = '55000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "SeatRefundAllocation" allocation
    JOIN "RefundEvent" refund ON refund."id" = allocation."refundEventId"
    WHERE allocation."sourceSeatRecordId" = NEW."id"
      AND allocation."sourceCountBefore" = OLD."count"
      AND allocation."sourceCountAfter" = NEW."count"
      AND allocation."sourceStatusBefore" = OLD."status"
      AND allocation."sourceStatusAfter" = NEW."status"
      AND refund."closedDealId" = NEW."closedDealId"
  ) THEN
    RAISE EXCEPTION 'A post-refund SeatRecord update requires a matching immutable allocation'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "SeatRecord_refund_allocation_required"
AFTER INSERT OR UPDATE OR DELETE ON "SeatRecord"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "verify_seat_record_refund_allocation"();

CREATE OR REPLACE FUNCTION "verify_refund_seat_allocation_total"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  allocated BIGINT;
  deal_net_receipts INTEGER;
BEGIN
  SELECT COALESCE(SUM(allocation."deltaSeats"), 0)
  INTO allocated
  FROM "SeatRefundAllocation" allocation
  WHERE allocation."refundEventId" = NEW."id";

  IF allocated <> NEW."seatsRefunded" THEN
    RAISE EXCEPTION 'RefundEvent refunded-seat total requires matching immutable allocations'
      USING ERRCODE = '23514';
  END IF;

  SELECT deal."netReceiptsCents"
  INTO deal_net_receipts
  FROM "ClosedDeal" deal
  WHERE deal."id" = NEW."closedDealId";

  IF deal_net_receipts > 0
     AND NEW."cumulativeRefundedCentsAfter" >= deal_net_receipts
     AND EXISTS (
       SELECT 1
       FROM "SeatRecord" seat
       WHERE seat."closedDealId" = NEW."closedDealId"
         AND seat."status" = 'PAID_COLLECTED'
     ) THEN
    RAISE EXCEPTION 'A fully refunded deal cannot retain paid-collected seats'
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "RefundEvent_seat_allocation_total"
AFTER INSERT ON "RefundEvent"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "verify_refund_seat_allocation_total"();

CREATE OR REPLACE FUNCTION "verify_seat_refund_allocation_consistency"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  event_deal_id TEXT;
  event_seats INTEGER;
  event_allocated BIGINT;
  source_row "SeatRecord"%ROWTYPE;
  refunded_row "SeatRecord"%ROWTYPE;
BEGIN
  SELECT refund."closedDealId", refund."seatsRefunded"
  INTO event_deal_id, event_seats
  FROM "RefundEvent" refund
  WHERE refund."id" = NEW."refundEventId";

  SELECT * INTO source_row
  FROM "SeatRecord" seat
  WHERE seat."id" = NEW."sourceSeatRecordId";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seat refund allocation source row does not exist'
      USING ERRCODE = '23503';
  END IF;

  SELECT * INTO refunded_row
  FROM "SeatRecord" seat
  WHERE seat."id" = NEW."refundedSeatRecordId";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seat refund allocation result row does not exist'
      USING ERRCODE = '23503';
  END IF;

  IF source_row."closedDealId" IS DISTINCT FROM event_deal_id
     OR refunded_row."closedDealId" IS DISTINCT FROM event_deal_id THEN
    RAISE EXCEPTION 'Seat refund allocation rows must belong to the RefundEvent ClosedDeal'
      USING ERRCODE = '23514';
  END IF;

  IF source_row."count" IS DISTINCT FROM NEW."sourceCountAfter"
     OR source_row."status" IS DISTINCT FROM NEW."sourceStatusAfter" THEN
    RAISE EXCEPTION 'Seat refund allocation terminal source state is inconsistent'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."sourceSeatRecordId" = NEW."refundedSeatRecordId" THEN
    IF refunded_row."count" IS DISTINCT FROM NEW."deltaSeats"
       OR refunded_row."status" <> 'REFUNDED' THEN
      RAISE EXCEPTION 'Whole-seat refund allocation result is inconsistent'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    IF refunded_row."count" IS DISTINCT FROM NEW."deltaSeats"
       OR refunded_row."status" <> 'REFUNDED'
       OR refunded_row."industryOrRegion" IS DISTINCT FROM source_row."industryOrRegion"
       OR refunded_row."sourcedByPartner" IS DISTINCT FROM source_row."sourcedByPartner"
       OR refunded_row."note" IS DISTINCT FROM source_row."note" THEN
      RAISE EXCEPTION 'Split-seat refund allocation result is inconsistent'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  SELECT COALESCE(SUM(allocation."deltaSeats"), 0)
  INTO event_allocated
  FROM "SeatRefundAllocation" allocation
  WHERE allocation."refundEventId" = NEW."refundEventId";

  IF event_allocated IS DISTINCT FROM event_seats THEN
    RAISE EXCEPTION 'Seat refund allocation sum must match its immutable RefundEvent total'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "SeatRefundAllocation_consistency"
AFTER INSERT ON "SeatRefundAllocation"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "verify_seat_refund_allocation_consistency"();

COMMIT;
