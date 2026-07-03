"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import type { PartnerFunction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin, requireAdminUser, requireSuperAdmin } from "@/lib/authz";
import { absoluteUrl } from "@/lib/utils";
import { safeSendEmail } from "@/lib/services/email";
import {
  partnerApplicationDecisionEmail,
  partnerCommissionPaidEmail,
  partnerDealClosedEmail,
  partnerDealConfirmedEmail,
  partnerDealDeclinedEmail,
} from "@/lib/email/templates";
import { notifyOwner } from "@/lib/services/owner-notify";
import {
  confirmDealSchema,
  dealMessageSchema,
  dealRevisionRequestSchema,
  decideSpecialDealItemSchema,
  decideSpecialDealRequestSchema,
  declineDealSchema,
  partnerProfileSchema,
  reviewApplicationSchema,
} from "@/lib/validations/partner";
import {
  ACTIVATION_GATE_ITEMS,
  PARTNER_FUNCTION_LABELS,
  SCORECARD_CHECKPOINTS,
  TIER_RECOGNITION,
} from "@/lib/partner/constants";
import { CONFIG_FIELD_META } from "@/lib/partner/constants";
import { parseConfigField } from "@/lib/partner/config-parse";
import { resolvePartnerConfig } from "@/lib/partner/config-server";
import {
  bpToCents,
  centsToBp,
  classifyOrigination,
  commissionLinePrecheck,
  companyNewnessState,
  computeDealCommission,
  deliverySingleRateBp,
  deriveFunctionRate,
  focusBonusBp,
  focusBonusRecomputeAction,
  normalizeDomain,
  normalizeEntityName,
  originationOpener,
  originationOverrideBp,
  proportionalReversalCents,
  type NewnessState,
} from "@/lib/partner/commission";
import {
  addMonths,
  clawbackWindowEnd,
  commissionPayableOn,
  firstRightExpiry,
  focusTenureYear,
  pipelineProtectionExpiry,
  trailPeriodEnd,
  withinOriginationWindow,
} from "@/lib/partner/rules";
import { countNewCompanyDomainsRolling } from "@/lib/partner/growth";
import { formatMoney, normalizeCurrencyCode, toMinorUnits } from "@/lib/partner/currency";
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
    academyUrl: absoluteUrl("/partner/academy"),
    onboardingUrl: absoluteUrl("/partner/onboarding"),
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
  if (reg.status !== "SUBMITTED" && reg.status !== "NEEDS_REVISION") {
    throw new Error("Only a submitted or under-revision registration can be confirmed.");
  }

  // The already-ours hard blocks work on NORMALIZED identity (name suffixes folded,
  // domain canonicalized), so "Acme, Inc." with a fresh domain cannot slip past a
  // house account or another partner's "Acme Incorporated".
  const regNameNorm = normalizeEntityName(reg.legalEntity);
  const regDomainNorm = normalizeDomain(reg.domain);

  // House Account guard: exact name, normalized name, or domain.
  const houseRows = await prisma.houseAccount.findMany({ select: { entityName: true, domain: true } });
  const houseHit = houseRows.some(
    (h) =>
      normalizeEntityName(h.entityName) === regNameNorm ||
      (regDomainNorm != null && normalizeDomain(h.domain) === regDomainNorm),
  );
  if (houseHit || isHouseAccount) {
    throw new Error("This entity is a House Account and cannot be registered. Decline the registration instead.");
  }

  // Duplicate / priority guard: another partner's live account with the same
  // normalized name in the same country, or the same canonical domain anywhere,
  // blocks this one (priority by first confirmation).
  const liveAccounts = await prisma.registeredAccount.findMany({
    where: { lapsedAt: null, partnerId: { not: reg.partnerId } },
    select: { legalEntity: true, country: true, domain: true },
  });
  const dupe = liveAccounts.some(
    (a) =>
      (normalizeEntityName(a.legalEntity) === regNameNorm && a.country.toLowerCase() === reg.country.toLowerCase()) ||
      (regDomainNorm != null && normalizeDomain(a.domain) === regDomainNorm),
  );
  if (dupe) throw new Error("Another partner already holds a confirmed registration for this entity (matched by name or domain).");

  // The classification decision on the Panel: objective by default; the admin may
  // only make it STRICTER (treat as an existing company, Qualified rate, no
  // new-company credit), never grant Strong by hand. A forced decision requires a
  // logged reason and notifies the owner.
  const classificationDecision = String(formData.get("classificationDecision") ?? "OBJECTIVE");
  const classificationReason = String(formData.get("classificationReason") ?? "").trim();
  if (classificationDecision === "EXISTING" && classificationReason.length < 5) {
    throw new Error("Forcing the existing-company classification requires a logged reason (at least 5 characters).");
  }

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
        domain: normalizeDomain(reg.domain),
        country: reg.country,
        businessUnit: reg.businessUnit,
        offering: reg.offering,
        scope: confirmedScope,
        protectionExpiresAt,
        lastMeaningfulUpdateAt: now,
        classificationOverride: classificationDecision === "EXISTING" ? "EXISTING" : null,
        classificationOverrideReason: classificationDecision === "EXISTING" ? classificationReason : null,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "PANEL_CONFIRM_DEAL_REGISTRATION",
        entity: "DealRegistration",
        entityId: reg.id,
        changes: {
          before: { status: reg.status },
          after: {
            status: "CONFIRMED",
            confirmedScope,
            classificationDecision,
            ...(classificationDecision === "EXISTING" ? { classificationReason } : {}),
          },
        },
      },
    });
  });
  if (classificationDecision === "EXISTING") {
    await notifyOwner({
      subject: `Classification forced to existing: ${reg.legalEntity}`,
      template: "owner_classification_override",
      body: `${admin.email ?? "An admin"} confirmed ${reg.legalEntity} with the existing-company classification forced (reason: ${classificationReason}). Originations on this account pay the Qualified rate.`,
      href: "/admin/partners/deal-registrations",
    });
  }

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
  const reg = await prisma.dealRegistration.findUniqueOrThrow({
    where: { id: parsed.data.dealRegistrationId },
    include: { partner: { select: { displayName: true, contactEmail: true } } },
  });
  if (reg.status !== "SUBMITTED" && reg.status !== "NEEDS_REVISION") {
    throw new Error("Only a submitted or under-revision registration can be declined.");
  }
  await prisma.dealRegistration.update({
    where: { id: reg.id },
    data: { status: "DECLINED", declineReason: parsed.data.declineReason, decidedAt: new Date(), confirmedByUserId: admin.id },
  });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "DEAL_REGISTRATION_DECLINED", entity: "DealRegistration", entityId: reg.id, after: { declineReason: parsed.data.declineReason } });
  // Tell the partner, with the reason: a decline is never silent.
  if (reg.partner.contactEmail) {
    const mail = partnerDealDeclinedEmail({
      fullName: reg.partner.displayName,
      legalEntity: reg.legalEntity,
      reason: parsed.data.declineReason,
    });
    await safeSendEmail({ to: reg.partner.contactEmail, subject: mail.subject, template: "partner_deal_declined", text: mail.text, html: mail.html });
  }
  safeRevalidatePath("/admin/partners/deal-registrations");
  safeRevalidatePath("/partner/deals");
}

/**
 * Ask the partner to revise an opportunity: sets it to NEEDS_REVISION, records
 * the feedback as an admin message on the thread, and emails the partner. The
 * partner can then edit and resubmit, which returns it to SUBMITTED.
 */
export async function requestDealRevision(formData: FormData) {
  const admin = await requireAdminUser();
  const parsed = dealRevisionRequestSchema.safeParse({
    dealRegistrationId: formData.get("dealRegistrationId"),
    feedback: formData.get("feedback"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid revision request.");
  const { dealRegistrationId, feedback } = parsed.data;

  const reg = await prisma.dealRegistration.findUniqueOrThrow({
    where: { id: dealRegistrationId },
    include: { partner: { select: { displayName: true, contactEmail: true } } },
  });
  if (reg.status !== "SUBMITTED" && reg.status !== "NEEDS_REVISION") {
    throw new Error("Only a submitted or under-revision registration can be sent back for revision.");
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.dealRegistration.update({
      where: { id: reg.id },
      data: { status: "NEEDS_REVISION", revisionRequestedAt: now },
    }),
    prisma.dealMessage.create({
      data: {
        dealRegistrationId: reg.id,
        authorUserId: admin.id,
        authorRole: "ADMIN",
        authorName: admin.name ?? "TenXPros",
        body: feedback,
      },
    }),
  ]);

  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "DEAL_REGISTRATION_REVISION_REQUESTED",
    entity: "DealRegistration",
    entityId: reg.id,
    after: { feedback },
  });
  await safeSendEmail({
    to: reg.partner.contactEmail,
    subject: `Please revise your opportunity: ${reg.legalEntity}`,
    template: "partner_deal_revision_requested",
    text:
      `Hello ${reg.partner.displayName},\n\n` +
      `We have reviewed your registered opportunity for ${reg.legalEntity} and would like a revision before we can confirm it.\n\n` +
      `Our note:\n${feedback}\n\n` +
      `Open the opportunity to read the full thread, edit the details, and resubmit:\n${absoluteUrl(`/partner/deals/${reg.id}`)}`,
  });

  safeRevalidatePath("/admin/partners/deal-registrations");
  safeRevalidatePath(`/partner/deals/${reg.id}`);
  safeRevalidatePath("/partner/deals");
}

/** Post an admin message to the thread under an opportunity. */
export async function postDealMessageAdmin(formData: FormData) {
  const admin = await requireAdminUser();
  const parsed = dealMessageSchema.safeParse({
    dealRegistrationId: formData.get("dealRegistrationId"),
    body: formData.get("body"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Write a message.");
  const { dealRegistrationId, body } = parsed.data;

  const reg = await prisma.dealRegistration.findUniqueOrThrow({
    where: { id: dealRegistrationId },
    include: { partner: { select: { displayName: true, contactEmail: true } } },
  });

  await prisma.dealMessage.create({
    data: {
      dealRegistrationId: reg.id,
      authorUserId: admin.id,
      authorRole: "ADMIN",
      authorName: admin.name ?? "TenXPros",
      body,
    },
  });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "DEAL_MESSAGE_POSTED",
    entity: "DealRegistration",
    entityId: reg.id,
    after: { authorRole: "ADMIN" },
  });
  await safeSendEmail({
    to: reg.partner.contactEmail,
    subject: `New message on your opportunity: ${reg.legalEntity}`,
    template: "partner_deal_message",
    text:
      `Hello ${reg.partner.displayName},\n\n` +
      `You have a new message on your registered opportunity for ${reg.legalEntity}:\n\n${body}\n\n` +
      `Open the thread to reply:\n${absoluteUrl(`/partner/deals/${reg.id}`)}`,
  });
  safeRevalidatePath("/admin/partners/deal-registrations");
  safeRevalidatePath(`/partner/deals/${reg.id}`);
}

// ===========================================================================
// Special-deal requests (decide the whole request and each detail item)
// ===========================================================================

/** Approve or reject a single out-of-rule detail on a special request. */
export async function decideSpecialDealItem(formData: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = decideSpecialDealItemSchema.safeParse({
    itemId: formData.get("itemId"),
    decision: formData.get("decision"),
    decisionNote: formData.get("decisionNote") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid item decision.");
  const { itemId, decision, decisionNote } = parsed.data;

  const item = await prisma.specialDealRequestItem.findUniqueOrThrow({
    where: { id: itemId },
    select: { id: true, requestId: true },
  });
  await prisma.specialDealRequestItem.update({
    where: { id: item.id },
    data: { status: decision === "APPROVE" ? "APPROVED" : "REJECTED", decisionNote: decisionNote || null },
  });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "SPECIAL_DEAL_ITEM_DECIDED",
    entity: "SpecialDealRequestItem",
    entityId: item.id,
    after: { decision },
  });
  safeRevalidatePath("/admin/partners/special-deals");
  safeRevalidatePath("/partner/special-deals");
}

/**
 * Finalize a special request as a whole. APPROVE_ALL and REJECT_ALL set every
 * item accordingly; FINALIZE_FROM_ITEMS derives the overall status from the
 * per-item decisions (all approved, all rejected, or partially approved) and
 * requires every item to already be decided.
 */
export async function decideSpecialDealRequest(formData: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = decideSpecialDealRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    decisionNote: formData.get("decisionNote") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid decision.");
  const { requestId, decision, decisionNote } = parsed.data;

  const request = await prisma.specialDealRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { items: true, partner: { select: { displayName: true, contactEmail: true } } },
  });

  let overall: "APPROVED" | "REJECTED" | "PARTIALLY_APPROVED";
  const now = new Date();

  if (decision === "APPROVE_ALL") {
    overall = "APPROVED";
    await prisma.specialDealRequestItem.updateMany({
      where: { requestId: request.id },
      data: { status: "APPROVED" },
    });
  } else if (decision === "REJECT_ALL") {
    overall = "REJECTED";
    await prisma.specialDealRequestItem.updateMany({
      where: { requestId: request.id },
      data: { status: "REJECTED" },
    });
  } else {
    // FINALIZE_FROM_ITEMS: every item must already be decided.
    const pending = request.items.filter((i) => i.status === "PENDING");
    if (pending.length > 0) {
      throw new Error("Decide every detail first, or use approve all / reject all.");
    }
    const approved = request.items.filter((i) => i.status === "APPROVED").length;
    const rejected = request.items.filter((i) => i.status === "REJECTED").length;
    overall = approved === 0 ? "REJECTED" : rejected === 0 ? "APPROVED" : "PARTIALLY_APPROVED";
  }

  await prisma.specialDealRequest.update({
    where: { id: request.id },
    data: { status: overall, decisionNote: decisionNote || null, decidedByUserId: admin.id, decidedAt: now },
  });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "SPECIAL_DEAL_REQUEST_DECIDED",
    entity: "SpecialDealRequest",
    entityId: request.id,
    after: { status: overall },
  });
  await safeSendEmail({
    to: request.partner.contactEmail,
    subject: `Decision on your special request: ${request.title}`,
    template: "partner_special_deal_decided",
    text:
      `Hello ${request.partner.displayName},\n\n` +
      `We have reviewed your special request "${request.title}". Overall status: ${overall.replace(/_/g, " ").toLowerCase()}.\n` +
      (decisionNote ? `\nNote from the team:\n${decisionNote}\n` : "") +
      `\nOpen your panel to see the decision on each detail:\n${absoluteUrl("/partner/special-deals")}`,
  });
  safeRevalidatePath("/admin/partners/special-deals");
  safeRevalidatePath("/partner/special-deals");
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
  // Canonical company domain: the identity the objective newness/origination rule
  // keys on. Use the entered value, else inherit the linked account's stored domain.
  let domain = normalizeDomain(formData.get("domain") as string | null);
  if (!domain && registeredAccountId) {
    const acct = await prisma.registeredAccount.findUnique({ where: { id: registeredAccountId }, select: { domain: true } });
    domain = normalizeDomain(acct?.domain ?? null);
  }
  const signedAt = formData.get("signedAt") ? new Date(String(formData.get("signedAt"))) : new Date();
  const deliveredAt = formData.get("deliveredAt") ? new Date(String(formData.get("deliveredAt"))) : null;
  const paymentClearedAt = formData.get("paymentClearedAt") ? new Date(String(formData.get("paymentClearedAt"))) : null;
  const isMajorNewEngagement = formData.get("isMajorNewEngagement") === "on";
  const industryOrRegion = String(formData.get("industryOrRegion") ?? "").trim() || null;

  // Renewal OVERRIDE trail: if this account was already opened, meaning an earlier
  // closed deal on it carries a (non-reversed) origination line, persist that
  // opener's actual origination rate so a later OVERRIDE line can pay a config
  // share of it, AND anchor the origination window to the OPENER's signedAt so the
  // override expires the configured months after the account was OPENED, not after
  // this renewal (which would let it never expire per account). The opener has no
  // earlier origination deal, so it keeps null and its own window and earns
  // origination directly. A deal with no registered account, or an account never
  // opened via a non-reversed origination line, also keeps null and its own window,
  // and OVERRIDE stays correctly refused.
  let originationRateBpAtOpen: number | null = null;
  let originationWindowStart: Date = signedAt;
  if (registeredAccountId) {
    const priorDeals = await prisma.closedDeal.findMany({
      where: { registeredAccountId },
      select: {
        signedAt: true,
        commissions: {
          where: {
            function: { in: ["QUALIFIED_ORIGINATION", "STRONG_ORIGINATION"] },
            status: { notIn: ["REVERSED"] },
          },
          select: { rateBp: true },
        },
      },
    });
    const opener = originationOpener(
      priorDeals.map((d) => ({ signedAt: d.signedAt, originationRateBps: d.commissions.map((c) => c.rateBp) })),
    );
    if (opener) {
      originationRateBpAtOpen = opener.rateBp;
      if (opener.signedAt) originationWindowStart = opener.signedAt;
    }
  }

  const deal = await prisma.closedDeal.create({
    data: {
      partnerId,
      registeredAccountId,
      domain,
      dealType,
      productLine,
      netReceiptsCents,
      currency: dealCurrency,
      conversionRate,
      conversionDate: paymentClearedAt,
      signedAt,
      deliveredAt,
      paymentClearedAt,
      originationWindowStart,
      originationRateBpAtOpen,
      trailPeriodEnd: trailPeriodEnd(signedAt, cfg),
      isMajorNewEngagement,
      industryOrRegion,
    },
  });
  // Keep both sides informed: the partner sees the close, the owner gets the signal.
  const dealPartner = await prisma.partner.findUnique({ where: { id: partnerId }, select: { displayName: true, contactEmail: true } });
  const dealEntity = registeredAccountId
    ? (await prisma.registeredAccount.findUnique({ where: { id: registeredAccountId }, select: { legalEntity: true } }))?.legalEntity ?? "your account"
    : "your account";
  if (dealPartner?.contactEmail) {
    const mail = partnerDealClosedEmail({ fullName: dealPartner.displayName, entity: dealEntity, panelUrl: absoluteUrl("/partner/commissions") });
    await safeSendEmail({ to: dealPartner.contactEmail, subject: mail.subject, template: "partner_deal_closed", text: mail.text, html: mail.html });
  }
  await notifyOwner({
    subject: `Closed deal recorded: ${dealPartner?.displayName ?? partnerId}`,
    template: "owner_deal_closed",
    body: `A closed ${dealType} deal was recorded for ${dealEntity} (partner ${dealPartner?.displayName ?? partnerId}).`,
    href: `/admin/partners/${partnerId}`,
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
/**
 * Add a commission line. The rate is DERIVED from config by function + deal kind
 * (never operator-typed). Per-line partner attribution: the deal owner by default;
 * a superadmin may credit a different performer, and an OVERRIDE always goes to the
 * account opener. A superadmin may weight-split one function among partners. The
 * DEAL OWNER's config and focus grant govern the cap regardless of who is credited.
 * Every line requires an evidence note; the focus bonus is applied by recompute.
 */
export async function addCommissionLine(formData: FormData) {
  const admin = await requireAdminUser();
  const closedDealId = String(formData.get("closedDealId") ?? "");
  const deal = await prisma.closedDeal.findUniqueOrThrow({ where: { id: closedDealId } });
  const fn = String(formData.get("function") ?? "") as PartnerFunction;

  // Evidence note is mandatory: the dispute-prevention record for every line.
  const evidenceNote = String(formData.get("evidenceNote") ?? "").trim();
  if (evidenceNote.length < 5) {
    return { ok: false, message: "Add an evidence note (at least 5 characters) explaining why this line applies." };
  }

  // The DEAL OWNER's resolved config and focus grant govern the cap and any focus
  // line; per-line partner attribution below only changes WHO is credited, never
  // which config or cap applies to the deal.
  const cfg = await resolvePartnerConfig(deal.partnerId);
  const partner = await prisma.partner.findUniqueOrThrow({
    where: { id: deal.partnerId },
    select: { tier: true, activeStatus: true },
  });

  const now = new Date();

  // Superadmin identity (email-based) gates the fixed-fee delivery exception, the
  // cross-partner attribution, and the weighted split.
  const superAdmin = isSuperAdmin(admin.email);
  let warmRelationshipAttested =
    formData.get("warmRelationshipAttested") === "on" || formData.get("warmRelationshipAttested") === "true";
  // A Basic Introduction claim made at registration already carries the partner's
  // own attestation; source it so the admin is never asked to re-attest what the
  // partner attested first-hand.
  if (fn === "BASIC_INTRO" && !warmRelationshipAttested && deal.registeredAccountId) {
    const claim = await prisma.dealFunctionClaim.findFirst({
      where: {
        function: "BASIC_INTRO",
        warmRelationshipAttested: true,
        dealRegistration: { registeredAccount: { id: deal.registeredAccountId } },
      },
      select: { id: true },
    });
    if (claim) warmRelationshipAttested = true;
  }
  const fixedFeeRequested =
    formData.get("fixedFeeException") === "on" || formData.get("fixedFeeException") === "true";
  const fixedFeeReason = String(formData.get("fixedFeeReason") ?? "").trim();

  // Objective preconditions before any rate work: a signed date for Closing, a
  // delivered date for Delivery (and superadmin + a logged reason for the fixed-fee
  // exception), and an explicit warm-relationship attestation for Basic Introduction.
  const precheck = commissionLinePrecheck({
    fn,
    signedAt: deal.signedAt,
    deliveredAt: deal.deliveredAt,
    warmRelationshipAttested,
    fixedFee: { requested: fixedFeeRequested, isSuperAdmin: superAdmin, reason: fixedFeeReason },
  });
  if (!precheck.ok) return { ok: false, message: precheck.message };

  const dealKind = deal.dealType as "B2C" | "B2B";
  let recordedFn: PartnerFunction = fn;
  let rateBp: number;
  let amountCents: number;
  let isFlat = false;
  // Dispute-proof context recorded alongside the line in the audit trail.
  const auditExtra: Record<string, unknown> = {};

  // Per-line partner attribution: default the deal owner. Only a SUPERADMIN may credit
  // a line to a different performer (with the mandatory evidence note). An OVERRIDE line
  // always overrides this to the account opener, in its own branch below.
  let linePartnerId = deal.partnerId;
  const attributedRaw = String(formData.get("attributedPartnerId") ?? "").trim();
  if (attributedRaw && attributedRaw !== deal.partnerId) {
    if (!superAdmin) return { ok: false, message: "Only a superadmin may credit a line to a partner other than the deal owner." };
    const performer = await prisma.partner.findUnique({ where: { id: attributedRaw }, select: { id: true } });
    if (!performer) return { ok: false, message: "The partner you tried to credit was not found." };
    linePartnerId = attributedRaw;
    auditExtra.attributedPartnerId = attributedRaw;
  }

  // Weighted split (superadmin only): one shared function split among partners. Each
  // shared line carries the FULL function rate plus a weightBp share; the engine counts
  // the group once against the cap and splits it, so the shared lines together equal
  // exactly one unshared line. The evidence note is the recorded reason.
  let weightBp: number | null = null;
  const weightRaw = formData.get("weightBp");
  if (weightRaw != null && String(weightRaw).trim() !== "") {
    if (!superAdmin) return { ok: false, message: "Only a superadmin may split a function among partners by weight." };
    const w = Math.round(Number(weightRaw));
    if (!Number.isFinite(w) || w <= 0 || w > 10000) return { ok: false, message: "Enter a weight between 1 and 10000 basis points." };
    weightBp = w;
    auditExtra.weightBp = w;
  }

  if (fn === "QUALIFIED_ORIGINATION" || fn === "STRONG_ORIGINATION") {
    // One origination per deal: a second unweighted line would double-pay the same
    // function. If the paid seat count changed after the line was added (seats
    // collected later), REVERSE the old line and re-add it; the engine reclassifies
    // from the current paid-collected seats. Weighted-split siblings (all carrying
    // weightBp) remain allowed: the engine counts the group once against the cap.
    const existingOrigination = await prisma.commissionEntry.findMany({
      where: { closedDealId: deal.id, function: { in: ["QUALIFIED_ORIGINATION", "STRONG_ORIGINATION"] }, status: { notIn: ["REVERSED"] } },
      select: { weightBp: true },
    });
    if (existingOrigination.length > 0 && (weightBp == null || existingOrigination.some((e) => e.weightBp == null))) {
      return {
        ok: false,
        message:
          "This deal already carries an origination line. If the paid seat count changed, reverse the old line and add it again so the engine reclassifies from the current paid-collected seats. For a genuinely shared origination, use weighted split lines instead.",
      };
    }
    // Origination strength AND rate are SERVER-DERIVED, never operator-chosen.
    // Strong is decided by SEAT COUNT (paid-collected only): B2C by seats alone,
    // B2B by a New/Dormant domain AND the seat threshold. Newness is a program-wide
    // fact, queried across ALL partners by domain.
    const domainNorm = normalizeDomain(deal.domain);
    const hasDomain = domainNorm != null;
    let newness: NewnessState = "NEW";
    if (domainNorm) {
      const priorDomainDeals = await prisma.closedDeal.findMany({
        where: { domain: { equals: domainNorm, mode: "insensitive" }, id: { not: deal.id } },
        select: { signedAt: true, paymentClearedAt: true },
      });
      newness = companyNewnessState(priorDomainDeals, now, cfg);
    }
    // The admin classification decision on the Panel: a stored force-existing
    // override (with its logged reason) makes the company count as already ours.
    // The admin can only make the classification stricter, never grant Strong.
    // Consulted through the linked account AND by canonical domain, so leaving the
    // account selector blank when recording the deal cannot bypass the decision.
    let forcedExisting = false;
    const overrideAcct = deal.registeredAccountId
      ? await prisma.registeredAccount.findFirst({
          where: { id: deal.registeredAccountId, classificationOverride: "EXISTING" },
          select: { classificationOverride: true, classificationOverrideReason: true },
        })
      : null;
    const overrideByDomain =
      !overrideAcct && domainNorm
        ? await prisma.registeredAccount.findFirst({
            where: { classificationOverride: "EXISTING", domain: { equals: domainNorm, mode: "insensitive" } },
            select: { classificationOverride: true, classificationOverrideReason: true },
          })
        : null;
    const override = overrideAcct ?? overrideByDomain;
    if (override) {
      forcedExisting = true;
      newness = "EXISTING";
      auditExtra.classificationOverride = "EXISTING";
      auditExtra.classificationOverrideReason = override.classificationOverrideReason ?? "";
    }
    // The seat count for the Strong test: PAID_COLLECTED seats only (pending does
    // not count; refunded and cancelled never count). No paid seats yet means the
    // count is unavailable and the classification stays Qualified, never Strong.
    const paidSeatAgg = await prisma.seatRecord.aggregate({
      where: { closedDealId: deal.id, status: "PAID_COLLECTED" },
      _sum: { count: true },
    });
    const seatCount = paidSeatAgg._sum.count ?? null;
    const cls = classifyOrigination({ newness, hasDomain, dealKind, seatCount, cfg });
    recordedFn = cls.function;
    rateBp = cls.rateBp;
    if (rateBp <= 0) {
      return { ok: false, message: "The engine computed a 0% origination rate. Check the deal kind and the configured rates." };
    }
    amountCents = bpToCents(deal.netReceiptsCents, rateBp);
    auditExtra.newness = forcedExisting ? "EXISTING (forced)" : newness;
    auditExtra.seatCount = seatCount;
    auditExtra.seatThreshold = dealKind === "B2B" ? cfg.strongSeatThresholdB2b : cfg.strongSeatThresholdB2c;
    auditExtra.isNewCompany = cls.isNewCompany;
    auditExtra.paidStrongRate = cls.paidStrongRate;
    auditExtra.classification = cls.reason;
  } else if (fn === "DELIVERY") {
    if (fixedFeeRequested) {
      // Superadmin fixed-fee exception (already validated by the precheck): a logged
      // reason is required and the operator supplies the fee in the deal's currency.
      const flatRaw = formData.get("flatFee");
      if (flatRaw == null || String(flatRaw).trim() === "") {
        return { ok: false, message: "Fixed-fee delivery exception: enter the fee amount." };
      }
      const flatCents = toMinorUnits(safeNonNegative(flatRaw, "fixed fee", 1e10), deal.currency);
      if (flatCents <= 0) return { ok: false, message: "Enter a fixed fee greater than zero." };
      isFlat = true;
      amountCents = flatCents;
      rateBp = centsToBp(flatCents, deal.netReceiptsCents);
      auditExtra.fixedFeeException = true;
      auditExtra.fixedFeeReason = fixedFeeReason;
    } else {
      // The single, config-sourced delivery rate. No band, no operator-typed rate.
      rateBp = deliverySingleRateBp(cfg);
      if (rateBp <= 0) return { ok: false, message: "The configured delivery rate is 0%, so there is nothing to record." };
      amountCents = bpToCents(deal.netReceiptsCents, rateBp);
    }
  } else if (fn === "OVERRIDE") {
    // The renewal OVERRIDE is B2B ONLY (enforced here, not just stated in the terms),
    // credited to the account OPENER, and Active Status is checked against the OPENER,
    // not the renewal deal's owner. If opener == owner the behavior is unchanged. If
    // no opener can be identified, no override line is created.
    if (dealKind !== "B2B") {
      return { ok: false, message: "The renewal override applies to B2B accounts only." };
    }
    if (!deal.registeredAccountId) {
      return { ok: false, message: "This deal has no registered account, so there is no origination opener to trail an override to." };
    }
    const priorDeals = await prisma.closedDeal.findMany({
      where: { registeredAccountId: deal.registeredAccountId, id: { not: deal.id } },
      select: {
        partnerId: true,
        signedAt: true,
        commissions: {
          where: { function: { in: ["QUALIFIED_ORIGINATION", "STRONG_ORIGINATION"] }, status: { notIn: ["REVERSED"] } },
          select: { rateBp: true },
        },
      },
    });
    const opener = originationOpener(
      priorDeals.map((d) => ({ signedAt: d.signedAt, originationRateBps: d.commissions.map((c) => c.rateBp), partnerId: d.partnerId })),
    );
    if (!opener || !opener.partnerId) {
      return { ok: false, message: "No origination opener on this account, so there is no override to trail." };
    }
    const openerPartner = await prisma.partner.findUnique({ where: { id: opener.partnerId }, select: { activeStatus: true } });
    const withinWindow = deal.originationWindowStart ? withinOriginationWindow(deal.originationWindowStart, now, cfg) : false;
    // The share and window are the DEAL OWNER's config; the Active Status is the OPENER's.
    const overrideBp = originationOverrideBp(
      { openRateBp: opener.rateBp, withinWindow, activeStatus: openerPartner?.activeStatus ?? false },
      cfg,
    );
    if (overrideBp <= 0) {
      return { ok: false, message: "Override is 0% here: the origination window has closed, or the opener is not on Active Status." };
    }
    recordedFn = "OVERRIDE";
    linePartnerId = opener.partnerId; // credit the OPENER, not the deal owner
    rateBp = overrideBp;
    amountCents = bpToCents(deal.netReceiptsCents, rateBp);
    auditExtra.overrideOpenerPartnerId = opener.partnerId;
    auditExtra.overrideOpenerRateBp = opener.rateBp;
    auditExtra.overrideWithinWindow = withinWindow;
    auditExtra.overrideOpenerActive = openerPartner?.activeStatus ?? false;
  } else {
    // BASIC_INTRO, CLOSING, GROWTH_BONUS, FOCUS_BONUS: config-derived rate.
    // The Growth Bonus counts new B2B organisations and is B2B ONLY, enforced here.
    if (fn === "GROWTH_BONUS" && dealKind !== "B2B") {
      return { ok: false, message: "The growth bonus counts new B2B organisations and is paid on B2B deals only." };
    }
    const newB2bOrgsRolling12 = fn === "GROWTH_BONUS" ? await countNewCompanyDomainsRolling(deal.partnerId, now, cfg) : 0;
    const derived = deriveFunctionRate(fn, {
      dealKind,
      cfg,
      newB2bOrgsRolling12,
      tier: partner.tier,
    });
    if (derived.kind === "AUTO_ONLY") return { ok: false, message: derived.reason };
    if (derived.kind === "FLAT") {
      return { ok: false, message: "Only Delivery supports a fixed fee, and only as a superadmin exception." };
    }
    rateBp = derived.rateBp;
    if (rateBp <= 0) {
      return {
        ok: false,
        message: "The engine computed a 0% rate for this function on this deal, so there is nothing to record. Check the deal kind or the config.",
      };
    }
    amountCents = bpToCents(deal.netReceiptsCents, rateBp);
  }

  // Weighted split: store the FULL function rate as rateBp and this partner's provisional
  // share as the amount. The exact cents-split under the cap is finalized on recompute,
  // which sees all sibling lines; like every pre-recompute amount, this one is provisional.
  if (weightBp != null) {
    if (isFlat) return { ok: false, message: "A fixed-fee line cannot be weight-split; split a percentage function instead." };
    amountCents = Math.round((amountCents * weightBp) / 10000);
  }

  const entry = await prisma.commissionEntry.create({
    data: {
      partnerId: linePartnerId,
      closedDealId: deal.id,
      function: recordedFn,
      rateBp,
      baseAmountCents: deal.netReceiptsCents,
      amountCents,
      isFlat,
      weightBp,
      evidenceNote,
      // Stored only for Basic Introduction (the precheck guarantees it is attested).
      warmRelationshipAttested: recordedFn === "BASIC_INTRO",
      currency: deal.currency,
    },
  });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "COMMISSION_LINE_ADDED",
    entity: "CommissionEntry",
    entityId: entry.id,
    after: { submittedFunction: fn, function: recordedFn, partnerId: linePartnerId, rateBp, amountCents, isFlat, weightBp, evidenceNote, ...auditExtra },
  });
  safeRevalidatePath(`/admin/partners/${deal.partnerId}`);
  return { ok: true };
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
    // Match ANY non-reversed FOCUS_BONUS (including a PAID one) so a second line is
    // never minted once one exists, and a settled PAID line is never re-scaled.
    const existing = await prisma.commissionEntry.findFirst({
      where: { closedDealId, function: "FOCUS_BONUS", status: { notIn: ["REVERSED"] } },
    });
    const action = focusBonusRecomputeAction(bonusBp, existing?.status ?? null);
    if (action !== "skip") {
      const amount = Math.round((deal.netReceiptsCents * bonusBp) / 10000);
      if (action === "update" && existing) {
        await prisma.commissionEntry.update({ where: { id: existing.id }, data: { rateBp: bonusBp, amountCents: amount } });
      } else if (action === "create") {
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

  // Commission already locked in PAID lines is deliberately excluded from the
  // recompute set (paid money is never re-scaled), but it still consumes the
  // per-deal cap. Feed its net amount (after any reversal) to the engine so the
  // recomputed lines can only fill the remaining headroom and paid + recomputed
  // can never breach the absolute cap.
  const paidEntries = await prisma.commissionEntry.findMany({
    where: { closedDealId, status: "PAID" },
    select: { amountCents: true, reversedCents: true, function: true, weightBp: true },
  });
  const committedExternalCents = paidEntries.reduce(
    (sum, e) => sum + Math.max(0, e.amountCents - e.reversedCents),
    0,
  );
  // For a weighted split whose siblings settle at different times, the amount of each
  // function already settled (PAID) so the surviving siblings in this recompute are
  // clamped to the remaining budget and the group can never overpay one unshared line.
  const settledByFunction = new Map<PartnerFunction, number>();
  for (const e of paidEntries) {
    if (e.weightBp != null) {
      settledByFunction.set(e.function, (settledByFunction.get(e.function) ?? 0) + Math.max(0, e.amountCents - e.reversedCents));
    }
  }
  const groupSettled = (e: (typeof entries)[number]) => (e.weightBp != null ? settledByFunction.get(e.function) ?? 0 : undefined);

  const result = computeDealCommission({
    netReceiptsCents: deal.netReceiptsCents,
    dealKind: deal.dealType as "B2C" | "B2B",
    focusActive,
    config: cfg,
    // Preserve each line's partner attribution and weight through the recompute so a
    // cross-partner override or a weighted split is never silently reassigned to the
    // deal owner. The engine groups weighted lines and splits them under the cap; the
    // row's partnerId/weightBp are untouched (only amountCents/payableOn are updated).
    // groupSettledCents lets a partially-settled weighted group clamp the survivors to
    // the remaining budget, so no settlement order or partner count can ever overpay.
    functions: entries.map((e) =>
      e.isFlat
        ? { function: e.function, flatCents: e.amountCents, partnerId: e.partnerId, weightBp: e.weightBp ?? undefined, groupSettledCents: groupSettled(e) }
        : { function: e.function, rateBp: e.rateBp, partnerId: e.partnerId, weightBp: e.weightBp ?? undefined, groupSettledCents: groupSettled(e) },
    ),
    committedExternalCents,
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
  // A payment is never silent: tell the partner what was paid and for what.
  if (status === "PAID" && entry.status !== "PAID") {
    const paidPartner = await prisma.partner.findUnique({
      where: { id: entry.partnerId },
      select: { displayName: true, contactEmail: true },
    });
    if (paidPartner?.contactEmail) {
      const net = Math.max(0, entry.amountCents - entry.reversedCents);
      const mail = partnerCommissionPaidEmail({
        fullName: paidPartner.displayName,
        functionLabel: PARTNER_FUNCTION_LABELS[entry.function] ?? entry.function,
        amountLabel: formatMoney(net, entry.currency),
        panelUrl: absoluteUrl("/partner/commissions"),
      });
      await safeSendEmail({ to: paidPartner.contactEmail, subject: mail.subject, template: "partner_commission_paid", text: mail.text, html: mail.html });
    }
  }
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
    // Clear every RESTRICT-protected record before the deals and the partner.
    // CommissionEntry has a RESTRICT link to Partner; TenXOpsEngagement and
    // QualityFlag each have a RESTRICT link to ClosedDeal, so they must be removed
    // before the deals or the deal delete throws a foreign-key error. We key each
    // delete on both the partner AND the partner's deal ids, so a record attached
    // via the deal (not the partner) is still cleared. Deleting the deals then
    // cascades their seats and refunds; deleting the partner cascades the rest
    // (registrations, accounts, config, academy progress, notifications, and more).
    const dealIds = (await tx.closedDeal.findMany({ where: { partnerId }, select: { id: true } })).map((d) => d.id);
    await tx.commissionEntry.deleteMany({ where: { OR: [{ partnerId }, { closedDealId: { in: dealIds } }] } });
    await tx.tenXOpsEngagement.deleteMany({ where: { OR: [{ partnerId }, { closedDealId: { in: dealIds } }] } });
    await tx.qualityFlag.deleteMany({ where: { OR: [{ partnerId }, { closedDealId: { in: dealIds } }] } });
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
