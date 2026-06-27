import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Every Partner Program state change writes an AuditLog row (reusing the existing
 * model). Panel Confirmations use a `PANEL_*` action so the admin audit view can
 * surface them distinctly. The admin partner-audit view filters by these entities.
 */
export const PARTNER_AUDIT_ENTITIES = [
  "PartnerApplication",
  "Partner",
  "ProgramConfig",
  "PartnerConfig",
  "DealRegistration",
  "RegisteredAccount",
  "CommissionEntry",
  "ClosedDeal",
  "SeatRecord",
  "TenXOpsEngagement",
  "FocusGrant",
  "HouseAccount",
  "RefundEvent",
  "QualityFlag",
  "ScorecardCheckpoint",
] as const;

export interface AuditInput {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

function toChanges(input: AuditInput): Prisma.InputJsonValue | undefined {
  if (input.before === undefined && input.after === undefined) return undefined;
  return { before: input.before ?? null, after: input.after ?? null } as Prisma.InputJsonValue;
}

/** Write one audit entry through the shared prisma client. */
export async function recordAudit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      changes: toChanges(input),
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
