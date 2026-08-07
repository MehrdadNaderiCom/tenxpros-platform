import { Prisma, type PrismaClient, type UserRole } from "@prisma/client";
import { lockClosedDealForFinancialWrite } from "@/lib/partner/refunds";

type DealLifecycleClient = Pick<PrismaClient, "$transaction">;

export type ClosedDealMilestoneInput = {
  closedDealId: string;
  deliveredAt?: Date;
  paymentClearedAt?: Date;
  actor: { id: string; role: UserRole };
  recordedAt?: Date;
};

export type ClosedDealMilestoneResult = {
  changed: boolean;
  partnerId: string;
  deliveredAt: Date | null;
  paymentClearedAt: Date | null;
  conversionDate: Date | null;
};

const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

function sameInstant(left: Date | null, right: Date): boolean {
  return left?.getTime() === right.getTime();
}

function assertRecordableMilestone(value: Date | undefined, label: string, recordedAt: Date): void {
  if (value === undefined) return;
  if (Number.isNaN(value.getTime())) throw new Error(`Enter a valid ${label} date.`);
  if (value.getTime() > recordedAt.getTime() + MAX_FUTURE_CLOCK_SKEW_MS) {
    throw new Error(`${label} cannot be recorded in the future.`);
  }
}

function resolveSetOnceMilestone(
  current: Date | null,
  requested: Date | undefined,
  label: string,
): { value: Date | null; changed: boolean } {
  if (requested === undefined) return { value: current, changed: false };
  if (current === null) return { value: requested, changed: true };
  if (sameInstant(current, requested)) return { value: current, changed: false };
  throw new Error(`${label} has already been recorded and cannot be changed.`);
}

/**
 * Append the two real-world lifecycle facts that may legitimately occur after a
 * deal is opened. The ClosedDeal row is the serialization point shared with
 * refunds, seats and commissions, so concurrent operators cannot overwrite a
 * first writer or produce duplicate audit records.
 *
 * Both milestones are set-once. An exact retry is an idempotent no-op. All
 * identity, amount, currency and clawback-policy columns remain immutable.
 */
export async function recordClosedDealMilestonesAtomically(
  db: DealLifecycleClient,
  input: ClosedDealMilestoneInput,
): Promise<ClosedDealMilestoneResult> {
  if (!input.closedDealId) throw new Error("Closed deal is required.");
  if (input.deliveredAt === undefined && input.paymentClearedAt === undefined) {
    throw new Error("Enter a delivery or payment-clearance date.");
  }

  const recordedAt = input.recordedAt ?? new Date();
  if (Number.isNaN(recordedAt.getTime())) throw new Error("Invalid lifecycle recording time.");
  assertRecordableMilestone(input.deliveredAt, "delivery", recordedAt);
  assertRecordableMilestone(input.paymentClearedAt, "payment clearance", recordedAt);

  return db.$transaction(async (tx) => {
    await lockClosedDealForFinancialWrite(tx, input.closedDealId);
    const current = await tx.closedDeal.findUniqueOrThrow({
      where: { id: input.closedDealId },
      select: {
        partnerId: true,
        deliveredAt: true,
        paymentClearedAt: true,
        conversionDate: true,
      },
    });

    const delivery = resolveSetOnceMilestone(current.deliveredAt, input.deliveredAt, "Delivery");
    const clearance = resolveSetOnceMilestone(
      current.paymentClearedAt,
      input.paymentClearedAt,
      "Payment clearance",
    );
    // conversionRate is an immutable close-time snapshot. conversionDate merely
    // records when that rate became applicable and may be filled once alongside
    // the first payment-clearance fact. An existing value is never rewritten.
    const conversionDate =
      current.conversionDate ??
      (input.paymentClearedAt !== undefined && clearance.value !== null ? clearance.value : null);
    const conversionDateChanged =
      current.conversionDate === null && conversionDate !== null;
    const changed = delivery.changed || clearance.changed || conversionDateChanged;

    if (!changed) {
      return {
        changed: false,
        partnerId: current.partnerId,
        deliveredAt: current.deliveredAt,
        paymentClearedAt: current.paymentClearedAt,
        conversionDate: current.conversionDate,
      };
    }

    // Refund processing snapshots and finalizes the deal's downstream money
    // state. Reopening a missing milestone afterward could change growth or
    // payability while commission recomputation is deliberately locked, so all
    // non-idempotent lifecycle writes must precede the first refund event.
    const refundCount = await tx.refundEvent.count({
      where: { closedDealId: input.closedDealId },
    });
    if (refundCount > 0) {
      throw new Error("Deal milestones are locked after a refund event has been recorded.");
    }

    const updated = await tx.closedDeal.update({
      where: { id: input.closedDealId },
      data: {
        deliveredAt: delivery.value,
        paymentClearedAt: clearance.value,
        conversionDate,
      },
      select: {
        partnerId: true,
        deliveredAt: true,
        paymentClearedAt: true,
        conversionDate: true,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: input.actor.id,
        actorRole: input.actor.role,
        action: "CLOSED_DEAL_MILESTONES_RECORDED",
        entity: "ClosedDeal",
        entityId: input.closedDealId,
        changes: {
          before: {
            deliveredAt: current.deliveredAt?.toISOString() ?? null,
            paymentClearedAt: current.paymentClearedAt?.toISOString() ?? null,
            conversionDate: current.conversionDate?.toISOString() ?? null,
          },
          after: {
            deliveredAt: updated.deliveredAt?.toISOString() ?? null,
            paymentClearedAt: updated.paymentClearedAt?.toISOString() ?? null,
            conversionDate: updated.conversionDate?.toISOString() ?? null,
          },
        } satisfies Prisma.InputJsonValue,
      },
    });

    return { changed: true, ...updated };
  });
}
