import { createHash } from "node:crypto";
import { Prisma, type PrismaClient, type RefundEventType, type SeatStatus, type UserRole } from "@prisma/client";
import { proportionalReversalCents } from "./commission";

export type RefundMutationInput = {
  closedDealId: string;
  type: RefundEventType;
  amountCents: number;
  seatsRefunded: number;
  /** Stable processor/provider event ID or operator reference for this event. */
  sourceReference: string;
  actor: { id: string; role: UserRole };
  occurredAt?: Date;
  note?: string | null;
};

export type RefundMutationResult = {
  refundEventId: string;
  duplicate: boolean;
  withinWindow: boolean;
  cumulativeRefundedCents: number;
  incrementalReversedCents: number;
};

type RefundDatabase = Pick<PrismaClient, "$transaction">;

type PendingSeatRefundAllocation = {
  sourceSeatRecordId: string;
  refundedSeatRecordId: string;
  deltaSeats: number;
  sourceCountBefore: number;
  sourceCountAfter: number;
  sourceStatusBefore: SeatStatus;
  sourceStatusAfter: SeatStatus;
};

export async function lockClosedDealForFinancialWrite(
  tx: Prisma.TransactionClient,
  closedDealId: string,
): Promise<void> {
  const locked = await tx.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT "id" FROM "ClosedDeal" WHERE "id" = ${closedDealId} FOR UPDATE`,
  );
  if (locked.length === 0) throw new Error("Closed deal not found.");
}

export const REFUND_EVENT_TYPES: readonly RefundEventType[] = [
  "REFUND",
  "CHARGEBACK",
  "CANCELLATION",
  "CREDIT",
  "REVERSAL",
];

export function refundRequestFingerprint(
  input: Pick<
    RefundMutationInput,
    "closedDealId" | "type" | "amountCents" | "seatsRefunded" | "sourceReference" | "occurredAt" | "note"
  >,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        closedDealId: input.closedDealId,
        type: input.type,
        amountCents: input.amountCents,
        seatsRefunded: input.seatsRefunded,
        sourceReference: normalizeRefundSourceReference(input.sourceReference),
        occurredAt: input.occurredAt?.toISOString() ?? null,
        note: input.note?.trim() || null,
      }),
    )
    .digest("hex");
}

export function normalizeRefundSourceReference(reference: string): string {
  return reference.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

/** The stable source reference is namespaced to its deal and stored as a fixed key. */
export function refundIdempotencyKey(closedDealId: string, sourceReference: string): string {
  return createHash("sha256")
    .update(`tenxpros-refund:v1:${closedDealId}:${normalizeRefundSourceReference(sourceReference)}`)
    .digest("hex");
}

function validateInput(input: RefundMutationInput) {
  if (!input.closedDealId) throw new Error("A closed deal is required.");
  if (!REFUND_EVENT_TYPES.includes(input.type)) throw new Error("Invalid refund event type.");
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents < 0) {
    throw new Error("Refund amount must be a non-negative integer in minor units.");
  }
  if (!Number.isSafeInteger(input.seatsRefunded) || input.seatsRefunded < 0) {
    throw new Error("Refunded seats must be a non-negative integer.");
  }
  if (input.amountCents === 0 && input.seatsRefunded === 0) {
    throw new Error("Enter a refund amount or at least one refunded seat.");
  }
  const sourceReference = input.sourceReference.trim();
  if (sourceReference.length < 4 || sourceReference.length > 160 || /[\u0000-\u001f\u007f]/.test(sourceReference)) {
    throw new Error("Enter a valid provider or event reference (4 to 160 characters).");
  }
}

/**
 * Append one refund event and apply its financial effects exactly once.
 *
 * Every caller for a deal first locks the ClosedDeal row. PostgreSQL therefore
 * serializes duplicate and concurrent refund requests before any aggregate,
 * commission, or seat state is read. A stable provider/operator reference is
 * namespaced to the deal and hashed into the unique database idempotency key,
 * so a timeout followed by a refresh or new login is still a safe retry.
 */
export async function applyRefundAtomically(
  db: RefundDatabase,
  input: RefundMutationInput,
): Promise<RefundMutationResult> {
  validateInput(input);
  const occurredAt = input.occurredAt ?? new Date();
  if (Number.isNaN(occurredAt.getTime())) throw new Error("Invalid refund event date.");
  if (occurredAt.getTime() > Date.now() + 5 * 60_000) {
    throw new Error("Refund event date cannot be in the future.");
  }
  const sourceReference = input.sourceReference.trim();
  const idempotencyKey = refundIdempotencyKey(input.closedDealId, sourceReference);
  const fingerprint = refundRequestFingerprint(input);

  return db.$transaction(
    async (tx) => {
      await lockClosedDealForFinancialWrite(tx, input.closedDealId);

      const duplicate = await tx.refundEvent.findUnique({
        where: { idempotencyKey },
      });
      if (duplicate) {
        if (duplicate.requestFingerprint !== fingerprint) {
          throw new Error("This event reference was already used for a different refund request.");
        }
        return {
          refundEventId: duplicate.id,
          duplicate: true,
          withinWindow: duplicate.withinWindow,
          cumulativeRefundedCents: duplicate.cumulativeRefundedCentsAfter ?? 0,
          incrementalReversedCents: duplicate.reversedCommissionCents,
        };
      }

      const deal = await tx.closedDeal.findUnique({
        where: { id: input.closedDealId },
        include: { commissions: true },
      });
      if (!deal) throw new Error("Closed deal not found.");
      const dealStart = deal.signedAt ?? deal.createdAt;
      if (occurredAt.getTime() < dealStart.getTime()) {
        throw new Error("Refund event date cannot be earlier than the deal date.");
      }

      const [allRefunds, eligibleRefunds] = await Promise.all([
        tx.refundEvent.aggregate({
          where: { closedDealId: deal.id },
          _sum: { amountCents: true },
        }),
        tx.refundEvent.aggregate({
          where: { closedDealId: deal.id, withinWindow: true },
          _sum: { amountCents: true },
        }),
      ]);
      const priorRefunded = allRefunds._sum.amountCents ?? 0;
      if (priorRefunded + input.amountCents > deal.netReceiptsCents) {
        throw new Error("The cumulative refund cannot exceed the deal's net receipts.");
      }

      const cumulativeRefunded = priorRefunded + input.amountCents;
      const fullRefund = cumulativeRefunded >= deal.netReceiptsCents && deal.netReceiptsCents > 0;
      const withinWindow = occurredAt.getTime() <= deal.clawbackWindowEndsAt.getTime();
      const eligibleCumulative =
        (eligibleRefunds._sum.amountCents ?? 0) + (withinWindow ? input.amountCents : 0);
      const allocations = withinWindow
        ? deal.commissions.flatMap((commission) => {
            // Never reduce an already-recorded reversal. This preserves legacy
            // financial history while enforcing the snapshot policy for new events.
            const target = Math.max(
              commission.reversedCents,
              proportionalReversalCents(commission.amountCents, eligibleCumulative, deal.netReceiptsCents),
            );
            if (target === commission.reversedCents) return [];
            return [
              {
                commission,
                target,
                statusAfter: target >= commission.amountCents ? ("REVERSED" as const) : commission.status,
                deltaCents: target - commission.reversedCents,
              },
            ];
          })
        : [];
      const incrementalReversed = allocations.reduce((sum, allocation) => sum + allocation.deltaCents, 0);

      for (const allocation of allocations) {
        await tx.commissionEntry.update({
          where: { id: allocation.commission.id },
          data: {
            reversedCents: allocation.target,
            status: allocation.statusAfter,
          },
        });
      }

      // Seat state is part of the same locked transaction and is therefore just
      // as retry-safe as the monetary reversal.
      let actualSeatsRefunded = 0;
      const seatAllocations: PendingSeatRefundAllocation[] = [];
      if (fullRefund) {
        const paidSeats = await tx.seatRecord.findMany({
          where: { closedDealId: deal.id, status: "PAID_COLLECTED", count: { gt: 0 } },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });
        actualSeatsRefunded = paidSeats.reduce((total, seat) => total + seat.count, 0);
        for (const seat of paidSeats) {
          await tx.seatRecord.update({ where: { id: seat.id }, data: { status: "REFUNDED" } });
          seatAllocations.push({
            sourceSeatRecordId: seat.id,
            refundedSeatRecordId: seat.id,
            deltaSeats: seat.count,
            sourceCountBefore: seat.count,
            sourceCountAfter: seat.count,
            sourceStatusBefore: seat.status,
            sourceStatusAfter: "REFUNDED",
          });
        }
      } else if (input.seatsRefunded > 0) {
        let remaining = input.seatsRefunded;
        const paidSeats = await tx.seatRecord.findMany({
          where: { closedDealId: deal.id, status: "PAID_COLLECTED", count: { gt: 0 } },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });
        const available = paidSeats.reduce((total, seat) => total + seat.count, 0);
        if (remaining > available) {
          throw new Error("Refunded seats cannot exceed the paid and collected seats on this deal.");
        }
        actualSeatsRefunded = input.seatsRefunded;
        for (const seat of paidSeats) {
          if (remaining <= 0) break;
          if (remaining >= seat.count) {
            await tx.seatRecord.update({ where: { id: seat.id }, data: { status: "REFUNDED" } });
            seatAllocations.push({
              sourceSeatRecordId: seat.id,
              refundedSeatRecordId: seat.id,
              deltaSeats: seat.count,
              sourceCountBefore: seat.count,
              sourceCountAfter: seat.count,
              sourceStatusBefore: seat.status,
              sourceStatusAfter: "REFUNDED",
            });
            remaining -= seat.count;
          } else {
            await tx.seatRecord.update({ where: { id: seat.id }, data: { count: seat.count - remaining } });
            const refundedSeat = await tx.seatRecord.create({
              data: {
                closedDealId: deal.id,
                count: remaining,
                status: "REFUNDED",
                industryOrRegion: seat.industryOrRegion,
                sourcedByPartner: seat.sourcedByPartner,
                note: seat.note,
              },
            });
            seatAllocations.push({
              sourceSeatRecordId: seat.id,
              refundedSeatRecordId: refundedSeat.id,
              deltaSeats: remaining,
              sourceCountBefore: seat.count,
              sourceCountAfter: seat.count - remaining,
              sourceStatusBefore: seat.status,
              sourceStatusAfter: seat.status,
            });
            remaining = 0;
          }
        }
      }

      const event = await tx.refundEvent.create({
        data: {
          closedDealId: deal.id,
          type: input.type,
          amountCents: input.amountCents,
          occurredAt,
          withinWindow,
          reversedCommissionCents: incrementalReversed,
          idempotencyKey,
          sourceReference,
          requestFingerprint: fingerprint,
          clawbackDaysAtEvent: deal.clawbackDaysAtClose,
          clawbackWindowEndsAt: deal.clawbackWindowEndsAt,
          seatsRefunded: actualSeatsRefunded,
          initiatedByUserId: input.actor.id,
          cumulativeRefundedCentsAfter: cumulativeRefunded,
          cumulativeEligibleCentsAfter: eligibleCumulative,
          note: input.note?.trim() || null,
        },
      });

      if (allocations.length > 0) {
        await tx.commissionClawbackAllocation.createMany({
          data: allocations.map((allocation) => ({
            refundEventId: event.id,
            commissionEntryId: allocation.commission.id,
            deltaCents: allocation.deltaCents,
            reversedBeforeCents: allocation.commission.reversedCents,
            reversedAfterCents: allocation.target,
            statusBefore: allocation.commission.status,
            statusAfter: allocation.statusAfter,
          })),
        });
      }

      if (seatAllocations.length > 0) {
        await tx.seatRefundAllocation.createMany({
          data: seatAllocations.map((allocation) => ({
            refundEventId: event.id,
            ...allocation,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: input.actor.id,
          actorRole: input.actor.role,
          action: "REFUND_APPLIED",
          entity: "RefundEvent",
          entityId: event.id,
          changes: {
            after: {
              closedDealId: deal.id,
              type: input.type,
              amountCents: input.amountCents,
              cumulativeRefunded,
              incrementalReversed,
              withinWindow,
              clawbackWindowEndsAt: deal.clawbackWindowEndsAt.toISOString(),
              fullRefund,
              seatsRefunded: actualSeatsRefunded,
              sourceReference,
              idempotencyKey,
            },
          },
        },
      });

      return {
        refundEventId: event.id,
        duplicate: false,
        withinWindow,
        cumulativeRefundedCents: cumulativeRefunded,
        incrementalReversedCents: incrementalReversed,
      };
    },
    { maxWait: 5_000, timeout: 15_000 },
  );
}
