"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import type { PartnerFunction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, requireSuperAdmin } from "@/lib/authz";
import { absoluteUrl } from "@/lib/utils";
import { safeSendEmail } from "@/lib/services/email";
import {
  partnerApplicationDecisionEmail,
  partnerDealConfirmedEmail,
} from "@/lib/email/templates";
import {
  confirmDealSchema,
  declineDealSchema,
  partnerProfileSchema,
  reviewApplicationSchema,
} from "@/lib/validations/partner";
import {
  ACTIVATION_GATE_ITEMS,
  SCORECARD_CHECKPOINTS,
  TIER_RECOGNITION,
} from "@/lib/partner/constants";
import { CONFIG_FIELD_META } from "@/lib/partner/constants";
import { parseConfigField } from "@/lib/partner/config-parse";
import { resolvePartnerConfig } from "@/lib/partner/config-server";
import { computeDealCommission, focusBonusBp, proportionalReversalCents } from "@/lib/partner/commission";
import {
  addMonths,
  clawbackWindowEnd,
  commissionPayableOn,
  firstRightExpiry,
  focusTenureYear,
  pipelineProtectionExpiry,
  trailPeriodEnd,
} from "@/lib/partner/rules";
import { normalizeCurrencyCode, toMinorUnits } from "@/lib/partner/currency";
import { recordAudit } from "@/lib/partner/audit";
import { safeRevalidatePath } from "@/lib/partner/revalidate";

type Admin = Awaited<ReturnType<typeof requireAdminUser>>;

/**
 * Light guard for an operator-entered amount/count: rejects NaN, negatives and
 * absurd values, then returns the clean number. Empty input becomes 0.
 */
function safeNonNegative(raw: FormDataEntryValue | null, label: string, max: number): number {
  const value = Number(raw ?? 0);
  if (!Number.isFinite(value) || value < 0) throw new Error(`Enter a valid ${label} (a number of 0 or more).`);
  if (value > max) throw new Error(`That ${label} looks too large. Please re-check the amount.`);
  return value;
}

// ===========================================================================
// Applications
// ===========================================================================

/** Approve (creates Partner + pilot + Panel Confirmation), reject, or hold. */
export async function reviewPartnerApplication(formData: FormData) {
  const admin = await requireAdminUser();
  const parsed = reviewApplicationSchema.safeParse({
    applicationId: formData.get("applicationId"),
    decision: formData.get("decision"),
    reviewerNotes: formData.get("reviewerNotes") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid review.");
  const { applicationId, decision, reviewerNotes } = parsed.data;

  const application = await prisma.partnerApplication.findUniqueOrThrow({
    where: { id: applicationId },
    include: { partner: true },
  });

  if (decision === "UNDER_REVIEW") {
    await prisma.partnerApplication.update({
      where: { id: applicationId },
      data: { status: "UNDER_REVIEW", reviewerNotes: reviewerNotes ?? null, reviewedAt: new Date(), reviewedBy: admin.id },
    });
    await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "PARTNER_APPLICATION_UNDER_REVIEW", entity: "PartnerApplication", entityId: applicationId, before: { status: application.status }, after: { status: "UNDER_REVIEW" } });
    safeRevalidatePath(`/admin/partners/applications/${applicationId}`);
    safeRevalidatePath("/admin/partners/applications");
    return;
  }

  if (decision === "REJECT") {
    await prisma.partnerApplication.update({
      where: { id: applicationId },
      data: { status: "REJECTED", reviewerNotes: reviewerNotes ?? null, reviewedAt: new Date(), reviewedBy: admin.id },
    });
    await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "PARTNER_APPLICATION_REJECTED", entity: "PartnerApplication", entityId: applicationId, before: { status: application.status }, after: { status: "REJECTED" } });
    const mail = partnerApplicationDecisionEmail({ fullName: application.fullName, approved: false, notes: reviewerNotes ?? null });
    await safeSendEmail({ to: application.email, subject: mail.subject, template: "partner_application_rejected", text: mail.text, html: mail.html });
    safeRevalidatePath(`/admin/partners/applications/${applicationId}`);
    safeRevalidatePath("/admin/partners/applications");
    return;
  }

  // APPROVE, idempotent if already approved.
  if (application.partner) {
    safeRevalidatePath(`/admin/partners/applications/${applicationId}`);
    return;
  }

  const setupToken = randomUUID();
  const tokenExpiry = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  const { partner, needsPassword } = await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({ where: { email: application.email } });
    const user = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          // Only promote a plain applicant; never downgrade an admin/participant.
          data: existingUser.role === "APPLICANT" ? { role: "PARTNER", name: existingUser.name ?? application.fullName } : {},
        })
      : await tx.user.create({ data: { email: application.email, name: application.fullName, role: "PARTNER" } });

    const created = await tx.partner.create({
      data: {
        userId: user.id,
        applicationId: application.id,
        status: "PILOT",
        tier: "TIER1",
        displayName: application.fullName,
        contactEmail: application.email,
        country: application.country,
        pilotStartDate: new Date(),
        recognitionTitle: TIER_RECOGNITION.TIER1.title,
      },
    });

    await tx.activationGateItem.createMany({
      data: ACTIVATION_GATE_ITEMS.map((i) => ({ partnerId: created.id, key: i.key, label: i.label })),
    });
    await tx.scorecardCheckpoint.createMany({
      data: SCORECARD_CHECKPOINTS.map((c) => ({ partnerId: created.id, day: c.day, requiredEvidence: c.requiredEvidence })),
    });

    await tx.partnerApplication.update({
      where: { id: application.id },
      data: { status: "APPROVED", reviewerNotes: reviewerNotes ?? null, reviewedAt: new Date(), reviewedBy: admin.id },
    });

    const needsPw = !user.passwordHash;
    if (needsPw) {
      await tx.verificationToken.deleteMany({ where: { identifier: application.email } });
      await tx.verificationToken.create({ data: { identifier: application.email, token: setupToken, expires: tokenExpiry } });
    }

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "PANEL_CONFIRM_PARTNER_APPROVED",
        entity: "Partner",
        entityId: created.id,
        changes: { before: { status: application.status }, after: { partnerStatus: "PILOT", tier: "TIER1" } },
        metadata: { applicationId: application.id },
      },
    });

    return { partner: created, needsPassword: needsPw };
  });

  const mail = partnerApplicationDecisionEmail({
    fullName: application.fullName,
    approved: true,
    notes: reviewerNotes ?? null,
    setPasswordUrl: needsPassword
      ? absoluteUrl(`/set-password?email=${encodeURIComponent(application.email)}&token=${encodeURIComponent(setupToken)}`)
      : null,
    panelUrl: absoluteUrl("/partner"),
  });
  await safeSendEmail({ to: application.email, subject: mail.subject, template: "partner_application_approved", text: mail.text, html: mail.html });

  safeRevalidatePath("/admin/partners/applications");
  safeRevalidatePath(`/admin/partners/applications/${applicationId}`);
  safeRevalidatePath("/admin/partners");
  void partner;
}

// ===========================================================================
// Partner lifecycle
// ===========================================================================

/** Panel Confirmation that the partner has passed the Activation Gate. */
export async function confirmActivationGate(formData: FormData) {
  const admin = await requireAdminUser();
  const partnerId = String(formData.get("partnerId") ?? "");
  const partner = await prisma.partner.findUniqueOrThrow({ where: { id: partnerId } });
  await prisma.partner.update({ where: { id: partnerId }, data: { activationGatePassedAt: new Date() } });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "PANEL_CONFIRM_ACTIVATION_GATE", entity: "Partner", entityId: partnerId, before: { activationGatePassedAt: partner.activationGatePassedAt?.toISOString() ?? null }, after: { activationGatePassedAt: new Date().toISOString() } });
  safeRevalidatePath(`/admin/partners/${partnerId}`);
  safeRevalidatePath("/partner");
}

/** Set the partner's tier (Panel Confirmation). Updates recognition title + status. */
export async function setPartnerTier(formData: FormData) {
  const admin = await requireAdminUser();
  const partnerId = String(formData.get("partnerId") ?? "");
  const tier = String(formData.get("tier") ?? "") as "TIER1" | "TIER2" | "TIER3";
  if (!["TIER1", "TIER2", "TIER3"].includes(tier)) throw new Error("Invalid tier.");
  const partner = await prisma.partner.findUniqueOrThrow({ where: { id: partnerId } });
  // Schedule C: Tier 3 requires the partner to already hold Tier 2.
  if (tier === "TIER3" && partner.tier !== "TIER2" && partner.tier !== "TIER3") {
    throw new Error("Tier 3 requires the partner to already hold Tier 2 (Schedule C).");
  }

  await prisma.partner.update({
    where: { id: partnerId },
    data: { tier, status: tier, recognitionTitle: TIER_RECOGNITION[tier].title },
  });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "PANEL_CONFIRM_TIER_CHANGE", entity: "Partner", entityId: partnerId, before: { tier: partner.tier, status: partner.status }, after: { tier, status: tier } });
  safeRevalidatePath(`/admin/partners/${partnerId}`);
}

/** Set active status, inactive, or terminate a partner. */
export async function setPartnerStatus(formData: FormData) {
  const admin = await requireAdminUser();
  const partnerId = String(formData.get("partnerId") ?? "");
  const action = String(formData.get("action") ?? ""); // ACTIVATE | DEACTIVATE | TERMINATE
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const partner = await prisma.partner.findUniqueOrThrow({ where: { id: partnerId } });

  let data: Prisma.PartnerUpdateInput;
  if (action === "TERMINATE") {
    data = { status: "TERMINATED", activeStatus: false, terminatedAt: new Date(), terminationReason: reason };
  } else if (action === "DEACTIVATE") {
    data = { status: "INACTIVE", activeStatus: false };
  } else if (action === "ACTIVATE") {
    // Restore to the tier-based status with active flag on.
    data = { status: partner.tier, activeStatus: true, lastActivityAt: new Date() };
  } else {
    throw new Error("Unknown status action.");
  }

  await prisma.partner.update({ where: { id: partnerId }, data });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: `PARTNER_${action}`, entity: "Partner", entityId: partnerId, before: { status: partner.status, activeStatus: partner.activeStatus }, after: { action, reason } });
  safeRevalidatePath(`/admin/partners/${partnerId}`);
  safeRevalidatePath("/admin/partners");
}

/** Mark a scorecard checkpoint met/unmet with a note. */
export async function setScorecardCheckpoint(formData: FormData) {
  const admin = await requireAdminUser();
  const id = String(formData.get("checkpointId") ?? "");
  const met = String(formData.get("met") ?? "") === "true";
  const reviewerNote = String(formData.get("reviewerNote") ?? "").trim() || null;
  const checkpoint = await prisma.scorecardCheckpoint.findUniqueOrThrow({ where: { id } });
  await prisma.scorecardCheckpoint.update({ where: { id }, data: { met, reviewerNote, reviewedAt: new Date() } });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "SCORECARD_CHECKPOINT_UPDATE", entity: "ScorecardCheckpoint", entityId: id, after: { day: checkpoint.day, met } });
  safeRevalidatePath(`/admin/partners/${checkpoint.partnerId}`);
}

// ===========================================================================
// Deal registrations
// ===========================================================================

/** Panel Confirmation of a deal registration → creates a Registered Account. */
export async function confirmDealRegistration(formData: FormData) {
  const admin = await requireAdminUser();
  const parsed = confirmDealSchema.safeParse({
    dealRegistrationId: formData.get("dealRegistrationId"),
    confirmedScope: formData.get("confirmedScope"),
    isHouseAccount: formData.get("isHouseAccount") === "on" || formData.get("isHouseAccount") === "true",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid confirmation.");
  const { dealRegistrationId, confirmedScope, isHouseAccount } = parsed.data;

  const reg = await prisma.dealRegistration.findUniqueOrThrow({
    where: { id: dealRegistrationId },
    include: { partner: true, registeredAccount: true },
  });
  if (reg.status !== "SUBMITTED") throw new Error("Only submitted registrations can be confirmed.");

  // House Account guard.
  const house = await prisma.houseAccount.findFirst({
    where: { entityName: { equals: reg.legalEntity, mode: "insensitive" } },
    select: { id: true },
  });
  if (house || isHouseAccount) {
    throw new Error("This entity is a House Account and cannot be registered. Decline the registration instead.");
  }

  // Duplicate / priority guard: a confirmed account for the same entity+country
  // already held by another partner blocks this one (priority by first confirmation).
  const dupe = await prisma.registeredAccount.findFirst({
    where: {
      legalEntity: { equals: reg.legalEntity, mode: "insensitive" },
      country: { equals: reg.country, mode: "insensitive" },
      lapsedAt: null,
      partnerId: { not: reg.partnerId },
    },
    select: { id: true },
  });
  if (dupe) throw new Error("Another partner already holds a confirmed registration for this entity and country.");

  const cfg = await resolvePartnerConfig(reg.partnerId);
  const now = new Date();
  const protectionExpiresAt = pipelineProtectionExpiry(now, reg.partner.tier, cfg);
  const firstRight = firstRightExpiry(now, cfg);

  await prisma.$transaction(async (tx) => {
    await tx.dealRegistration.update({
      where: { id: reg.id },
      data: {
        status: "CONFIRMED",
        confirmedScope,
        confirmedByUserId: admin.id,
        firstRightExpiresAt: firstRight,
        pipelineProtectionExpiresAt: protectionExpiresAt,
        decidedAt: now,
      },
    });
    await tx.registeredAccount.create({
      data: {
        dealRegistrationId: reg.id,
        partnerId: reg.partnerId,
        legalEntity: reg.legalEntity,
        country: reg.country,
        businessUnit: reg.businessUnit,
        offering: reg.offering,
        scope: confirmedScope,
        protectionExpiresAt,
        lastMeaningfulUpdateAt: now,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "PANEL_CONFIRM_DEAL_REGISTRATION",
        entity: "DealRegistration",
        entityId: reg.id,
        changes: { before: { status: "SUBMITTED" }, after: { status: "CONFIRMED", confirmedScope } },
      },
    });
  });

  const mail = partnerDealConfirmedEmail({
    fullName: reg.partner.displayName,
    entity: reg.legalEntity,
    confirmedScope,
    pipelineProtectionExpiresAt: protectionExpiresAt,
    panelUrl: absoluteUrl("/partner/deals"),
  });
  await safeSendEmail({ to: reg.partner.contactEmail, subject: mail.subject, template: "partner_deal_confirmed", text: mail.text, html: mail.html });

  safeRevalidatePath("/admin/partners/deal-registrations");
  safeRevalidatePath("/partner/deals");
}

export async function declineDealRegistration(formData: FormData) {
  const admin = await requireAdminUser();
  const parsed = declineDealSchema.safeParse({
    dealRegistrationId: formData.get("dealRegistrationId"),
    declineReason: formData.get("declineReason"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid decline.");
  const reg = await prisma.dealRegistration.findUniqueOrThrow({ where: { id: parsed.data.dealRegistrationId } });
  if (reg.status !== "SUBMITTED") throw new Error("Only submitted registrations can be declined.");
  await prisma.dealRegistration.update({
    where: { id: reg.id },
    data: { status: "DECLINED", declineReason: parsed.data.declineReason, decidedAt: new Date(), confirmedByUserId: admin.id },
  });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "DEAL_REGISTRATION_DECLINED", entity: "DealRegistration", entityId: reg.id, after: { declineReason: parsed.data.declineReason } });
  safeRevalidatePath("/admin/partners/deal-registrations");
  safeRevalidatePath("/partner/deals");
}

// ===========================================================================
// Configuration (global + per-partner override)
// ===========================================================================

/** Update the global ProgramConfig. Only changed (non-blank) fields are applied. */
export async function updateProgramConfig(formData: FormData) {
  const admin = await requireAdminUser();
  const data: Record<string, unknown> = {};
  for (const field of CONFIG_FIELD_META) {
    const value = parseConfigField(field.unit, formData.get(field.key as string) as string | null);
    if (value !== null) data[field.key as string] = value;
  }
  data.updatedBy = admin.email ?? admin.id;
  await prisma.programConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data } as Prisma.ProgramConfigUncheckedCreateInput,
    update: data as Prisma.ProgramConfigUncheckedUpdateInput,
  });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "PROGRAM_CONFIG_UPDATE", entity: "ProgramConfig", entityId: "singleton", after: data });
  safeRevalidatePath("/admin/partners/config");
}

/** Upsert a partner's config overrides. Blank fields clear the override (→ default). */
export async function upsertPartnerConfigOverride(formData: FormData) {
  const admin = await requireAdminUser();
  const partnerId = String(formData.get("partnerId") ?? "");
  await prisma.partner.findUniqueOrThrow({ where: { id: partnerId } });
  const data: Record<string, unknown> = {};
  for (const field of CONFIG_FIELD_META) {
    // null → explicit clear of the override.
    data[field.key as string] = parseConfigField(field.unit, formData.get(field.key as string) as string | null);
  }
  await prisma.partnerConfig.upsert({
    where: { partnerId },
    create: { partnerId, ...data } as Prisma.PartnerConfigUncheckedCreateInput,
    update: data as Prisma.PartnerConfigUncheckedUpdateInput,
  });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "PARTNER_CONFIG_UPDATE", entity: "PartnerConfig", entityId: partnerId, after: data });
  safeRevalidatePath(`/admin/partners/${partnerId}`);
}

// ===========================================================================
// Closed deals, seats, commissions
// ===========================================================================

export async function recordClosedDeal(formData: FormData) {
  const admin = await requireAdminUser();
  const partnerId = String(formData.get("partnerId") ?? "");
  await prisma.partner.findUniqueOrThrow({ where: { id: partnerId } });
  const cfg = await resolvePartnerConfig(partnerId);
  const payoutCurrency = normalizeCurrencyCode(cfg.currency);

  const dealType = String(formData.get("dealType") ?? "B2B") as "B2C" | "B2B";
  const productLine = String(formData.get("productLine") ?? "TENXPROS") as "TENXPROS" | "TENXOPS";

  // Multi-currency: net receipts are entered in the CUSTOMER's currency (major
  // units), stored as that currency's minor units. The conversion rate to the
  // payout currency is captured at the cleared date (clause 14.2A).
  const dealCurrency = normalizeCurrencyCode(String(formData.get("currency") ?? payoutCurrency), payoutCurrency);
  // Net receipts are entered in major units; reject NaN/negative and cap the
  // amount so a fat-fingered entry cannot record an absurd deal.
  const netReceipts = safeNonNegative(formData.get("netReceipts"), "net receipts amount", 1e10);
  const netReceiptsCents = toMinorUnits(netReceipts, dealCurrency);
  const sameCurrency = dealCurrency === payoutCurrency;
  const conversionRate = sameCurrency ? 1 : Math.max(0, Number(formData.get("conversionRate") ?? 0)) || 1;

  const registeredAccountId = String(formData.get("registeredAccountId") ?? "") || null;
  const signedAt = formData.get("signedAt") ? new Date(String(formData.get("signedAt"))) : new Date();
  const deliveredAt = formData.get("deliveredAt") ? new Date(String(formData.get("deliveredAt"))) : null;
  const paymentClearedAt = formData.get("paymentClearedAt") ? new Date(String(formData.get("paymentClearedAt"))) : null;
  const isMajorNewEngagement = formData.get("isMajorNewEngagement") === "on";
  const industryOrRegion = String(formData.get("industryOrRegion") ?? "").trim() || null;

  const deal = await prisma.closedDeal.create({
    data: {
      partnerId,
      registeredAccountId,
      dealType,
      productLine,
      netReceiptsCents,
      currency: dealCurrency,
      conversionRate,
      conversionDate: paymentClearedAt,
      signedAt,
      deliveredAt,
      paymentClearedAt,
      originationWindowStart: signedAt,
      trailPeriodEnd: trailPeriodEnd(signedAt, cfg),
      isMajorNewEngagement,
      industryOrRegion,
    },
  });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "CLOSED_DEAL_RECORDED",
    entity: "ClosedDeal",
    entityId: deal.id,
    after: { partnerId, dealType, netReceiptsCents, currency: dealCurrency, conversionRate, payoutCurrency },
  });
  safeRevalidatePath(`/admin/partners/${partnerId}`);
  safeRevalidatePath("/admin/partners/commissions");
}

export async function recordSeats(formData: FormData) {
  const admin = await requireAdminUser();
  const closedDealId = String(formData.get("closedDealId") ?? "");
  const deal = await prisma.closedDeal.findUniqueOrThrow({ where: { id: closedDealId } });
  const count = Math.round(safeNonNegative(formData.get("count"), "seat count", 100000));
  const status = String(formData.get("status") ?? "PAID_COLLECTED") as "PENDING" | "PAID_COLLECTED" | "REFUNDED" | "CANCELLED";
  const industryOrRegion = String(formData.get("industryOrRegion") ?? "").trim() || deal.industryOrRegion || null;
  const sourcedByPartner = formData.get("sourcedByPartner") !== "false";
  const seat = await prisma.seatRecord.create({ data: { closedDealId, count, status, industryOrRegion, sourcedByPartner } });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "SEATS_RECORDED", entity: "SeatRecord", entityId: seat.id, after: { closedDealId, count, status } });
  safeRevalidatePath(`/admin/partners/${deal.partnerId}`);
}

export async function updateSeatStatus(formData: FormData) {
  const admin = await requireAdminUser();
  const id = String(formData.get("seatId") ?? "");
  const status = String(formData.get("status") ?? "") as "PENDING" | "PAID_COLLECTED" | "REFUNDED" | "CANCELLED";
  const seat = await prisma.seatRecord.update({ where: { id }, data: { status }, include: { closedDeal: true } });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "SEAT_STATUS_UPDATE", entity: "SeatRecord", entityId: id, after: { status } });
  safeRevalidatePath(`/admin/partners/${seat.closedDeal.partnerId}`);
}

/**
 * Add a raw commission line (a percentage function OR a fixed fee). Amounts are
 * in the deal's currency minor units. The cap is applied on recompute; a fixed
 * fee keeps its exact amount through recompute (isFlat).
 */
export async function addCommissionLine(formData: FormData) {
  const admin = await requireAdminUser();
  const closedDealId = String(formData.get("closedDealId") ?? "");
  const deal = await prisma.closedDeal.findUniqueOrThrow({ where: { id: closedDealId } });
  const fn = String(formData.get("function") ?? "") as PartnerFunction;
  // A rate is in basis points: clamp NaN/negatives to 0 and cap at 10000 (100%).
  const rateRaw = Number(formData.get("rateBp") ?? 0);
  const rateBp = Math.min(10000, Math.max(0, Number.isFinite(rateRaw) ? Math.round(rateRaw) : 0));
  // A fixed fee is entered in the deal's currency (major units).
  const flatRaw = formData.get("flatFee");
  const isFlat = flatRaw != null && String(flatRaw).trim() !== "";
  const flatMajor = isFlat ? safeNonNegative(flatRaw, "fixed fee", 1e10) : 0;
  const flatCents = isFlat ? toMinorUnits(flatMajor, deal.currency) : null;
  const amountCents = isFlat ? (flatCents as number) : Math.round((deal.netReceiptsCents * rateBp) / 10000);

  const entry = await prisma.commissionEntry.create({
    data: {
      partnerId: deal.partnerId,
      closedDealId: deal.id,
      function: fn,
      rateBp: isFlat ? Math.round(((flatCents as number) * 10000) / Math.max(1, deal.netReceiptsCents)) : rateBp,
      baseAmountCents: deal.netReceiptsCents,
      amountCents,
      isFlat,
      currency: deal.currency,
    },
  });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "COMMISSION_LINE_ADDED", entity: "CommissionEntry", entityId: entry.id, after: { function: fn, rateBp, amountCents, isFlat } });
  safeRevalidatePath(`/admin/partners/${deal.partnerId}`);
}

/**
 * Recompute a deal's commission lines: auto-apply the Tier-3 focus bonus at the
 * grant's continuously-held tenure rate, then clamp to the cap and set payable
 * timing. Idempotent. Refused once a refund exists (refunds are final and must
 * not be re-derived). All amounts stay in the deal's currency.
 */
export async function recomputeDealCommissions(formData: FormData) {
  const admin = await requireAdminUser();
  const closedDealId = String(formData.get("closedDealId") ?? "");
  const deal = await prisma.closedDeal.findUniqueOrThrow({ where: { id: closedDealId } });
  const cfg = await resolvePartnerConfig(deal.partnerId);

  const refundCount = await prisma.refundEvent.count({ where: { closedDealId } });
  if (refundCount > 0) {
    safeRevalidatePath(`/admin/partners/${deal.partnerId}`);
    return;
  }

  // The Tier-3 focus 35% ceiling applies ONLY to a deal in the partner's active
  // focus industry/region, never to ordinary deals (which keep the 25%/30% cap).
  const grant = deal.industryOrRegion
    ? await prisma.focusGrant.findFirst({
        where: { partnerId: deal.partnerId, status: "ACTIVE", industryOrRegion: { equals: deal.industryOrRegion, mode: "insensitive" } },
        orderBy: { grantedAt: "desc" },
      })
    : null;
  const focusActive = Boolean(grant);

  // Auto-apply the focus bonus at the grant's continuously-held tenure rate.
  if (grant) {
    const atDate = deal.paymentClearedAt ?? deal.signedAt ?? new Date();
    const bonusBp = focusBonusBp(focusTenureYear(grant.continuouslyHeldSince, atDate), cfg);
    const existing = await prisma.commissionEntry.findFirst({
      where: { closedDealId, function: "FOCUS_BONUS", status: { in: ["ACCRUED", "PAYABLE"] } },
    });
    if (bonusBp > 0) {
      const amount = Math.round((deal.netReceiptsCents * bonusBp) / 10000);
      if (existing) {
        await prisma.commissionEntry.update({ where: { id: existing.id }, data: { rateBp: bonusBp, amountCents: amount } });
      } else {
        await prisma.commissionEntry.create({
          data: { partnerId: deal.partnerId, closedDealId, function: "FOCUS_BONUS", rateBp: bonusBp, baseAmountCents: deal.netReceiptsCents, amountCents: amount, currency: deal.currency },
        });
      }
    }
  }

  const entries = await prisma.commissionEntry.findMany({
    where: { closedDealId, status: { in: ["ACCRUED", "PAYABLE"] } },
    orderBy: { createdAt: "asc" },
  });
  if (entries.length === 0) {
    safeRevalidatePath(`/admin/partners/${deal.partnerId}`);
    return;
  }

  const result = computeDealCommission({
    netReceiptsCents: deal.netReceiptsCents,
    dealKind: deal.dealType as "B2C" | "B2B",
    focusActive,
    config: cfg,
    functions: entries.map((e) => (e.isFlat ? { function: e.function, flatCents: e.amountCents } : { function: e.function, rateBp: e.rateBp })),
  });
  const payableOn = commissionPayableOn(deal.deliveredAt, deal.paymentClearedAt, cfg);

  await prisma.$transaction(
    entries.map((e, i) =>
      prisma.commissionEntry.update({ where: { id: e.id }, data: { amountCents: result.entries[i].amountCents, payableOn } }),
    ),
  );
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "COMMISSIONS_RECOMPUTED",
    entity: "ClosedDeal",
    entityId: closedDealId,
    after: { totalCents: result.totalCents, capped: result.capped, overCap: result.overCap, focusActive, payableOn: payableOn?.toISOString() ?? null },
  });
  safeRevalidatePath(`/admin/partners/${deal.partnerId}`);
  safeRevalidatePath("/admin/partners/commissions");
}

export async function setCommissionStatus(formData: FormData) {
  const admin = await requireAdminUser();
  const id = String(formData.get("commissionEntryId") ?? "");
  const status = String(formData.get("status") ?? "") as "ACCRUED" | "PAYABLE" | "PAID" | "REVERSED";
  if (!["ACCRUED", "PAYABLE", "PAID", "REVERSED"].includes(status)) throw new Error("Invalid status.");
  const entry = await prisma.commissionEntry.findUniqueOrThrow({ where: { id } });
  await prisma.commissionEntry.update({
    where: { id },
    data: { status, paidOn: status === "PAID" ? new Date() : entry.paidOn },
  });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "COMMISSION_STATUS_CHANGE", entity: "CommissionEntry", entityId: id, before: { status: entry.status }, after: { status } });
  safeRevalidatePath("/admin/partners/commissions");
  safeRevalidatePath(`/admin/partners/${entry.partnerId}`);
}

/**
 * Record a refund/chargeback/cancellation and reverse commission. The reversal is
 * CUMULATIVE and IDEMPOTENT: each line's reversedCents is recomputed as its
 * proportional share of the total refunded-to-date, so successive partial refunds
 * never under- or over-reverse and re-applying the same refund is a no-op. Net
 * payable on a line = amountCents - reversedCents; fully-reversed lines flip to
 * REVERSED. The clawback window is computed from signing; refunded seats stop
 * counting toward targets/tiers/bonuses. Amounts are in the deal's currency.
 */
export async function applyRefund(formData: FormData) {
  const admin = await requireAdminUser();
  const closedDealId = String(formData.get("closedDealId") ?? "");
  const type = String(formData.get("type") ?? "REFUND") as "REFUND" | "CHARGEBACK" | "CANCELLATION" | "CREDIT" | "REVERSAL";
  const deal = await prisma.closedDeal.findUniqueOrThrow({ where: { id: closedDealId }, include: { commissions: true } });
  const cfg = await resolvePartnerConfig(deal.partnerId);
  const refundCents = toMinorUnits(safeNonNegative(formData.get("amount"), "refund amount", 1e10), deal.currency);
  const seatsRefunded = Math.round(safeNonNegative(formData.get("seatsRefunded"), "refunded seat count", 100000));

  const priorAgg = await prisma.refundEvent.aggregate({ where: { closedDealId }, _sum: { amountCents: true } });
  const priorRefunded = priorAgg._sum.amountCents ?? 0;
  const cumulativeRefunded = Math.min(priorRefunded + refundCents, deal.netReceiptsCents);
  const fullRefund = cumulativeRefunded >= deal.netReceiptsCents && deal.netReceiptsCents > 0;
  const now = new Date();
  const withinWindow = now.getTime() <= clawbackWindowEnd(deal.signedAt ?? deal.createdAt, cfg).getTime();

  let incrementalReversed = 0;

  await prisma.$transaction(async (tx) => {
    for (const c of deal.commissions) {
      const target = proportionalReversalCents(c.amountCents, cumulativeRefunded, deal.netReceiptsCents);
      if (target === c.reversedCents) continue;
      incrementalReversed += target - c.reversedCents;
      await tx.commissionEntry.update({
        where: { id: c.id },
        data: {
          reversedCents: target,
          status: target >= c.amountCents ? "REVERSED" : c.status === "REVERSED" ? "ACCRUED" : c.status,
          note: `Reversed ${target}/${c.amountCents} (${type})`,
        },
      });
    }

    // A refunded/cancelled seat does not count toward any target, tier or bonus.
    if (fullRefund) {
      await tx.seatRecord.updateMany({ where: { closedDealId, status: "PAID_COLLECTED" }, data: { status: "REFUNDED" } });
    } else if (seatsRefunded > 0) {
      let remaining = seatsRefunded;
      const paidSeats = await tx.seatRecord.findMany({ where: { closedDealId, status: "PAID_COLLECTED" }, orderBy: { createdAt: "asc" } });
      for (const s of paidSeats) {
        if (remaining <= 0) break;
        if (remaining >= s.count) {
          await tx.seatRecord.update({ where: { id: s.id }, data: { status: "REFUNDED" } });
          remaining -= s.count;
        } else {
          await tx.seatRecord.update({ where: { id: s.id }, data: { count: s.count - remaining } });
          await tx.seatRecord.create({ data: { closedDealId, count: remaining, status: "REFUNDED", industryOrRegion: s.industryOrRegion, sourcedByPartner: s.sourcedByPartner } });
          remaining = 0;
        }
      }
    }

    await tx.refundEvent.create({ data: { closedDealId, type, amountCents: refundCents, reversedCommissionCents: incrementalReversed, withinWindow } });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "REFUND_APPLIED",
        entity: "ClosedDeal",
        entityId: closedDealId,
        changes: { after: { type, refundCents, cumulativeRefunded, incrementalReversed, withinWindow, fullRefund, seatsRefunded } },
      },
    });
  });

  safeRevalidatePath(`/admin/partners/${deal.partnerId}`);
  safeRevalidatePath("/admin/partners/commissions");
}

// ===========================================================================
// House accounts, quality flags, focus grants, TenXOps
// ===========================================================================

export async function addHouseAccount(formData: FormData) {
  const admin = await requireAdminUser();
  const entityName = String(formData.get("entityName") ?? "").trim();
  if (entityName.length < 2) throw new Error("Enter an entity name.");
  const domain = String(formData.get("domain") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const created = await prisma.houseAccount.create({ data: { entityName, domain, note, createdByUserId: admin.id } });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "HOUSE_ACCOUNT_ADDED", entity: "HouseAccount", entityId: created.id, after: { entityName } });
  safeRevalidatePath("/admin/partners/house-accounts");
}

export async function removeHouseAccount(formData: FormData) {
  const admin = await requireAdminUser();
  const id = String(formData.get("houseAccountId") ?? "");
  const existing = await prisma.houseAccount.findUniqueOrThrow({ where: { id } });
  await prisma.houseAccount.delete({ where: { id } });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "HOUSE_ACCOUNT_REMOVED", entity: "HouseAccount", entityId: id, before: { entityName: existing.entityName } });
  safeRevalidatePath("/admin/partners/house-accounts");
}

export async function addQualityFlag(formData: FormData) {
  const admin = await requireAdminUser();
  const partnerId = String(formData.get("partnerId") ?? "");
  await prisma.partner.findUniqueOrThrow({ where: { id: partnerId } });
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 2) throw new Error("Enter a reason.");
  const disregardForTargets = formData.get("disregardForTargets") === "on";
  const closedDealId = String(formData.get("closedDealId") ?? "") || null;
  const flag = await prisma.qualityFlag.create({ data: { partnerId, closedDealId, reason, disregardForTargets } });
  if (disregardForTargets) {
    await prisma.partner.update({ where: { id: partnerId }, data: { qualityFlagged: true } });
  }
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "QUALITY_FLAG_ADDED", entity: "QualityFlag", entityId: flag.id, after: { reason, disregardForTargets } });
  safeRevalidatePath(`/admin/partners/${partnerId}`);
}

/**
 * Grant or re-earn a Tier-3 industry/region focus (Schedule C). Re-earning the
 * SAME focus keeps continuous tenure (the bonus steps up 1%/year toward the 35%
 * ceiling); a fresh grant after a lapse resets tenure to year 1. Expiry is 12
 * months (UTC). The applied per-deal bonus is computed from tenure at recompute.
 */
export async function grantFocus(formData: FormData) {
  const admin = await requireAdminUser();
  const partnerId = String(formData.get("partnerId") ?? "");
  const partner = await prisma.partner.findUniqueOrThrow({ where: { id: partnerId } });
  const industryOrRegion = String(formData.get("industryOrRegion") ?? "").trim();
  if (industryOrRegion.length < 2) throw new Error("Enter the focus industry or region.");
  if (partner.tier !== "TIER3") throw new Error("Only Tier 3 partners can hold a focus.");
  const cfg = await resolvePartnerConfig(partnerId);
  const now = new Date();
  const expiresAt = addMonths(now, 12);

  const existingActive = await prisma.focusGrant.findFirst({
    where: { partnerId, status: "ACTIVE", industryOrRegion: { equals: industryOrRegion, mode: "insensitive" } },
    orderBy: { grantedAt: "desc" },
  });
  const heldSince = existingActive ? existingActive.continuouslyHeldSince : now;
  const bonusBp = focusBonusBp(focusTenureYear(heldSince, now), cfg);

  const grant = existingActive
    ? await prisma.focusGrant.update({ where: { id: existingActive.id }, data: { grantedAt: now, expiresAt, currentBonusBp: bonusBp } })
    : await prisma.focusGrant.create({
        data: { partnerId, industryOrRegion, grantedAt: now, expiresAt, continuouslyHeldSince: now, currentBonusBp: bonusBp, status: "ACTIVE" },
      });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "PANEL_CONFIRM_FOCUS_GRANT",
    entity: "FocusGrant",
    entityId: grant.id,
    after: { industryOrRegion, reEarned: Boolean(existingActive), currentBonusBp: bonusBp },
  });
  safeRevalidatePath(`/admin/partners/${partnerId}`);
}

/** Lapse or withdraw a focus (resets tenure: a future re-grant restarts at year 1). */
export async function endFocus(formData: FormData) {
  const admin = await requireAdminUser();
  const id = String(formData.get("focusGrantId") ?? "");
  const status = String(formData.get("status") ?? "LAPSED") === "WITHDRAWN" ? "WITHDRAWN" : "LAPSED";
  const grant = await prisma.focusGrant.update({ where: { id }, data: { status } });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "FOCUS_ENDED", entity: "FocusGrant", entityId: id, after: { status } });
  safeRevalidatePath(`/admin/partners/${grant.partnerId}`);
}

/** Confirm or decline a partner's TenXOps engagement request. */
export async function decideTenXOpsEngagement(formData: FormData) {
  const admin = await requireAdminUser();
  const id = String(formData.get("engagementId") ?? "");
  const decision = String(formData.get("decision") ?? ""); // CONFIRM | DECLINE
  const engagement = await prisma.tenXOpsEngagement.findUniqueOrThrow({ where: { id }, include: { partner: true } });
  if (engagement.status !== "REQUESTED") throw new Error("Already decided.");
  if (decision === "CONFIRM") {
    await prisma.tenXOpsEngagement.update({ where: { id }, data: { status: "CONFIRMED", decidedAt: new Date(), confirmedByUserId: admin.id } });
    await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "PANEL_CONFIRM_TENXOPS_ENGAGEMENT", entity: "TenXOpsEngagement", entityId: id, after: { status: "CONFIRMED" } });
  } else if (decision === "DECLINE") {
    const reason = String(formData.get("reason") ?? "").trim() || null;
    await prisma.tenXOpsEngagement.update({ where: { id }, data: { status: "DECLINED", decidedAt: new Date(), declineReason: reason } });
    await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "TENXOPS_ENGAGEMENT_DECLINED", entity: "TenXOpsEngagement", entityId: id, after: { status: "DECLINED" } });
  } else {
    throw new Error("Unknown decision.");
  }
  safeRevalidatePath("/admin/partners/deal-registrations");
  safeRevalidatePath(`/admin/partners/${engagement.partnerId}`);
}

// ===========================================================================
// Admin edit / delete
// ===========================================================================

/** Admin edit of a partner's core profile (display name, contact email, country). */
export async function updatePartnerProfileAdmin(formData: FormData) {
  const admin = await requireAdminUser();
  const partnerId = String(formData.get("partnerId") ?? "");
  const partner = await prisma.partner.findUniqueOrThrow({ where: { id: partnerId } });
  const parsed = partnerProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    contactEmail: formData.get("contactEmail"),
    country: formData.get("country") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Please check the form.");
  await prisma.partner.update({
    where: { id: partnerId },
    data: {
      displayName: parsed.data.displayName,
      contactEmail: parsed.data.contactEmail,
      country: parsed.data.country || null,
    },
  });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "PARTNER_PROFILE_UPDATED",
    entity: "Partner",
    entityId: partnerId,
    before: { displayName: partner.displayName, contactEmail: partner.contactEmail, country: partner.country },
    after: parsed.data,
  });
  safeRevalidatePath(`/admin/partners/${partnerId}`);
  safeRevalidatePath("/admin/partners");
}

/**
 * Permanently delete a partner. Blocked when the partner has recorded financial
 * history (closed deals or commission entries are RESTRICT-protected for the
 * audit trail); deactivate or terminate such a partner instead. Otherwise
 * cascade-removes the pilot/scorecard/config/registrations and demotes the
 * linked user back to APPLICANT. Super-admin only.
 */
export async function deletePartner(formData: FormData) {
  const admin = await requireSuperAdmin();
  const partnerId = String(formData.get("partnerId") ?? "");
  const partner = await prisma.partner.findUniqueOrThrow({
    where: { id: partnerId },
    include: { _count: { select: { closedDeals: true, commissions: true } } },
  });
  if (partner._count.closedDeals > 0 || partner._count.commissions > 0) {
    throw new Error(
      "This partner has recorded financial history (closed deals or commissions) and cannot be deleted. Deactivate or terminate instead.",
    );
  }
  await prisma.$transaction(async (tx) => {
    if (partner.userId) {
      const user = await tx.user.findUnique({ where: { id: partner.userId }, select: { role: true } });
      if (user?.role === "PARTNER") {
        await tx.user.update({ where: { id: partner.userId }, data: { role: "APPLICANT" } });
      }
    }
    await tx.partner.delete({ where: { id: partnerId } });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "PARTNER_DELETED",
        entity: "Partner",
        entityId: partnerId,
        changes: { before: { displayName: partner.displayName, contactEmail: partner.contactEmail, status: partner.status } },
      },
    });
  });
  safeRevalidatePath("/admin/partners");
  redirect("/admin/partners");
}

/**
 * FORCE delete a partner INCLUDING its financial history (closed deals,
 * commissions, seats, refunds). This destroys the audit trail and is
 * irreversible; the UI requires a checkbox acknowledgement plus two confirmation
 * dialogs, and the server re-checks the acknowledgement. Super-admin only.
 */
export async function forceDeletePartner(formData: FormData) {
  const admin = await requireSuperAdmin();
  const partnerId = String(formData.get("partnerId") ?? "");
  if (String(formData.get("acknowledge") ?? "") !== "on") {
    throw new Error("You must acknowledge that this also permanently deletes all financial history.");
  }
  const partner = await prisma.partner.findUniqueOrThrow({ where: { id: partnerId } });
  await prisma.$transaction(async (tx) => {
    // Clear the RESTRICT-protected financial records first, then quality flags
    // (which may reference closed deals), then the deals (cascading their seats +
    // refunds), then the partner (cascading the remaining children).
    await tx.commissionEntry.deleteMany({ where: { partnerId } });
    await tx.qualityFlag.deleteMany({ where: { partnerId } });
    await tx.closedDeal.deleteMany({ where: { partnerId } });
    if (partner.userId) {
      const user = await tx.user.findUnique({ where: { id: partner.userId }, select: { role: true } });
      if (user?.role === "PARTNER") {
        await tx.user.update({ where: { id: partner.userId }, data: { role: "APPLICANT" } });
      }
    }
    await tx.partner.delete({ where: { id: partnerId } });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "PARTNER_FORCE_DELETED",
        entity: "Partner",
        entityId: partnerId,
        changes: {
          before: { displayName: partner.displayName, contactEmail: partner.contactEmail, status: partner.status },
          after: { forcedDeletionWithFinancialHistory: true },
        },
      },
    });
  });
  safeRevalidatePath("/admin/partners");
  redirect("/admin/partners");
}

/** Admin edit of a partner application's applicant contact details. Validated + audited. */
export async function updatePartnerApplication(formData: FormData) {
  const admin = await requireAdminUser();
  const applicationId = String(formData.get("applicationId") ?? "");
  const existing = await prisma.partnerApplication.findUniqueOrThrow({ where: { id: applicationId } });

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const linkedinUrl = String(formData.get("linkedinUrl") ?? "").trim();

  if (fullName.length < 2) throw new Error("Full name is required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("A valid email is required.");
  if (country.length < 2) throw new Error("Country is required.");
  if (linkedinUrl && !/^https?:\/\//i.test(linkedinUrl)) throw new Error("LinkedIn must be a valid URL.");

  await prisma.partnerApplication.update({
    where: { id: applicationId },
    data: { fullName, email, phone: phone || null, country, region: region || null, linkedinUrl: linkedinUrl || null },
  });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "PARTNER_APPLICATION_UPDATED",
    entity: "PartnerApplication",
    entityId: applicationId,
    before: { fullName: existing.fullName, email: existing.email, phone: existing.phone, country: existing.country, region: existing.region, linkedinUrl: existing.linkedinUrl },
    after: { fullName, email, phone, country, region, linkedinUrl },
  });
  safeRevalidatePath(`/admin/partners/applications/${applicationId}`);
  safeRevalidatePath("/admin/partners/applications");
}

/**
 * Permanently delete a partner application (cascade-removes its uploaded resume /
 * cover letter). Blocked once the application has been approved into a partner;
 * delete that partner record first. Super-admin only.
 */
export async function deletePartnerApplication(formData: FormData) {
  const admin = await requireSuperAdmin();
  const applicationId = String(formData.get("applicationId") ?? "");
  const application = await prisma.partnerApplication.findUniqueOrThrow({
    where: { id: applicationId },
    include: { partner: { select: { id: true } } },
  });
  if (application.partner) {
    throw new Error("This application was approved into a partner. Delete the partner record first.");
  }
  await prisma.partnerApplication.delete({ where: { id: applicationId } });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorRole: admin.role,
      action: "PARTNER_APPLICATION_DELETED",
      entity: "PartnerApplication",
      entityId: applicationId,
      changes: { before: { fullName: application.fullName, email: application.email, status: application.status } },
    },
  });
  safeRevalidatePath("/admin/partners/applications");
  redirect("/admin/partners/applications");
}
