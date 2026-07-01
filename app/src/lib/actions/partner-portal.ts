"use server";

import { prisma } from "@/lib/prisma";
import {
  advanceAccountStageSchema,
  dealMessageSchema,
  dealRegistrationSchema,
  logAccountActivitySchema,
  partnerProfileSchema,
  resubmitDealSchema,
  specialDealRequestSchema,
  tenXOpsRequestSchema,
} from "@/lib/validations/partner";
import { requirePartner } from "@/lib/partner/auth";
import { recordAudit } from "@/lib/partner/audit";
import { safeRevalidatePath } from "@/lib/partner/revalidate";
import { notifyOwner } from "@/lib/services/owner-notify";

function usdToCents(usd: number | undefined): number | null {
  if (usd == null || !Number.isFinite(usd)) return null;
  return Math.round(usd * 100);
}

/** Mark an Activation Gate checklist item complete/incomplete (own partner only). */
export async function setActivationItem(formData: FormData) {
  const { partner } = await requirePartner();
  const key = String(formData.get("key") ?? "");
  const completed = String(formData.get("completed") ?? "") === "true";
  if (!key) throw new Error("Missing item key.");

  const item = await prisma.activationGateItem.findUnique({
    where: { partnerId_key: { partnerId: partner.id, key } },
  });
  if (!item) throw new Error("Unknown checklist item.");

  await prisma.activationGateItem.update({
    where: { id: item.id },
    data: { completed, completedAt: completed ? new Date() : null },
  });
  await prisma.partner.update({ where: { id: partner.id }, data: { lastActivityAt: new Date() } });

  // When the partner finishes the last item and is still awaiting confirmation,
  // tell the owner so they can confirm the Activation Gate.
  if (completed && !partner.activationGatePassedAt) {
    const items = await prisma.activationGateItem.findMany({ where: { partnerId: partner.id }, select: { completed: true } });
    if (items.length > 0 && items.every((i) => i.completed)) {
      await notifyOwner({
        subject: `Partner ready for activation: ${partner.displayName}`,
        template: "owner_partner_activation_ready",
        body: `${partner.displayName} has completed every Activation Gate item and is awaiting your Panel Confirmation.`,
        href: `/admin/partners/${partner.id}`,
      });
    }
  }

  await recordAudit({
    actorId: partner.userId,
    actorRole: "PARTNER",
    action: "ACTIVATION_ITEM_UPDATE",
    entity: "Partner",
    entityId: partner.id,
    after: { key, completed },
  });
  safeRevalidatePath("/partner/onboarding");
  safeRevalidatePath("/partner");
}

/** Submit a deal registration (Schedule B). Effective only on Panel Confirmation. */
export async function submitDealRegistration(formData: FormData) {
  const { partner } = await requirePartner();
  if (!partner.activationGatePassedAt) {
    return { ok: false, message: "Complete the Activation Gate before registering deals." };
  }

  const parsed = dealRegistrationSchema.safeParse({
    productLine: formData.get("productLine"),
    offering: formData.get("offering"),
    legalEntity: formData.get("legalEntity"),
    country: formData.get("country"),
    businessUnit: formData.get("businessUnit") || undefined,
    contactName: formData.get("contactName") || undefined,
    contactTitle: formData.get("contactTitle") || undefined,
    estSeats: formData.get("estSeats") || undefined,
    estValueUsd: formData.get("estValueUsd") || undefined,
    functionsIntended: formData.getAll("functionsIntended").map(String),
    justification: formData.get("justification"),
    widerScopeRequested: formData.get("widerScopeRequested") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const data = parsed.data;

  const registration = await prisma.dealRegistration.create({
    data: {
      partnerId: partner.id,
      productLine: data.productLine,
      offering: data.offering,
      legalEntity: data.legalEntity,
      country: data.country,
      businessUnit: data.businessUnit || null,
      contactName: data.contactName || null,
      contactTitle: data.contactTitle || null,
      estSeats: data.estSeats ? Number.parseInt(data.estSeats, 10) : null,
      estValueCents: data.estValueUsd ? usdToCents(Number(data.estValueUsd)) : null,
      functionsIntended: data.functionsIntended ?? [],
      justification: data.justification,
      widerScopeRequested: data.widerScopeRequested || null,
    },
  });

  await prisma.partner.update({ where: { id: partner.id }, data: { lastActivityAt: new Date() } });
  await recordAudit({
    actorId: partner.userId,
    actorRole: "PARTNER",
    action: "DEAL_REGISTRATION_SUBMITTED",
    entity: "DealRegistration",
    entityId: registration.id,
    after: { legalEntity: data.legalEntity, country: data.country, offering: data.offering },
  });

  await notifyOwner({
    subject: `New deal registration: ${partner.displayName}`,
    template: "owner_deal_registration",
    body: `${partner.displayName} registered a deal (${data.legalEntity}, ${data.country}). It is awaiting your review and confirmation.`,
    href: "/admin/partners/deal-registrations",
  });

  safeRevalidatePath("/partner/deals");
  safeRevalidatePath("/admin/partners/deal-registrations");
  return { ok: true, id: registration.id };
}

/** Request to open a TenXOps engagement on an account the partner coaches (10A). */
export async function requestTenXOpsEngagement(formData: FormData) {
  const { partner } = await requirePartner();
  const parsed = tenXOpsRequestSchema.safeParse({
    registeredAccountId: formData.get("registeredAccountId"),
    organisation: formData.get("organisation"),
    justification: formData.get("justification"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const data = parsed.data;

  // IDOR guard: the account must belong to this partner.
  const account = await prisma.registeredAccount.findFirst({
    where: { id: data.registeredAccountId, partnerId: partner.id },
    select: { id: true },
  });
  if (!account) return { ok: false, message: "That account is not one of yours." };

  const engagement = await prisma.tenXOpsEngagement.create({
    data: {
      partnerId: partner.id,
      registeredAccountId: account.id,
      organisation: data.organisation,
      justification: data.justification,
    },
  });

  await recordAudit({
    actorId: partner.userId,
    actorRole: "PARTNER",
    action: "TENXOPS_ENGAGEMENT_REQUESTED",
    entity: "TenXOpsEngagement",
    entityId: engagement.id,
    after: { organisation: data.organisation },
  });
  await notifyOwner({
    subject: `New TenXOps request: ${partner.displayName}`,
    template: "owner_tenxops_request",
    body: `${partner.displayName} requested a TenXOps engagement for ${data.organisation}. It is awaiting your decision.`,
    href: "/admin/partners/deal-registrations",
  });
  safeRevalidatePath("/partner/tenxops");
  safeRevalidatePath("/admin/partners/deal-registrations");
  return { ok: true, id: engagement.id };
}

/**
 * Move one of the partner's own Registered Accounts to a new pipeline stage.
 * Advancing a stage is a meaningful update: it refreshes lastMeaningfulUpdateAt
 * (so the lapse cadence resets) and clears any prior lapse marker, and it writes
 * a STAGE_CHANGE activity so the account has a full, auditable history.
 */
export async function advanceAccountStage(formData: FormData) {
  const { partner } = await requirePartner();
  const parsed = advanceAccountStageSchema.safeParse({
    registeredAccountId: formData.get("registeredAccountId"),
    stage: formData.get("stage"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const { registeredAccountId, stage, note } = parsed.data;

  // IDOR guard: the account must belong to this partner.
  const account = await prisma.registeredAccount.findFirst({
    where: { id: registeredAccountId, partnerId: partner.id },
    select: { id: true, stage: true, legalEntity: true },
  });
  if (!account) return { ok: false, message: "That account is not one of yours." };
  if (account.stage === stage) return { ok: false, message: "The account is already at that stage." };

  const now = new Date();
  const label = note?.trim()
    ? note.trim()
    : `Stage moved from ${account.stage} to ${stage}.`;
  await prisma.$transaction([
    prisma.registeredAccount.update({
      where: { id: account.id },
      data: { stage, lastMeaningfulUpdateAt: now, lapsedAt: null },
    }),
    prisma.accountActivity.create({
      data: {
        registeredAccountId: account.id,
        partnerId: partner.id,
        kind: "STAGE_CHANGE",
        note: label,
        stageAfter: stage,
      },
    }),
    prisma.partner.update({ where: { id: partner.id }, data: { lastActivityAt: now } }),
  ]);

  await recordAudit({
    actorId: partner.userId,
    actorRole: "PARTNER",
    action: "ACCOUNT_STAGE_ADVANCED",
    entity: "RegisteredAccount",
    entityId: account.id,
    after: { from: account.stage, to: stage },
  });
  safeRevalidatePath("/partner/accounts");
  safeRevalidatePath(`/partner/accounts/${account.id}`);
  return { ok: true };
}

/**
 * Log an activity on one of the partner's own Registered Accounts. Logging a
 * meaningful activity refreshes lastMeaningfulUpdateAt and clears the lapse
 * marker, which is what keeps the account's protection from lapsing.
 */
export async function logAccountActivity(formData: FormData) {
  const { partner } = await requirePartner();
  const parsed = logAccountActivitySchema.safeParse({
    registeredAccountId: formData.get("registeredAccountId"),
    kind: formData.get("kind"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const { registeredAccountId, kind, note } = parsed.data;

  const account = await prisma.registeredAccount.findFirst({
    where: { id: registeredAccountId, partnerId: partner.id },
    select: { id: true },
  });
  if (!account) return { ok: false, message: "That account is not one of yours." };

  const now = new Date();
  await prisma.$transaction([
    prisma.accountActivity.create({
      data: { registeredAccountId: account.id, partnerId: partner.id, kind, note },
    }),
    prisma.registeredAccount.update({
      where: { id: account.id },
      data: { lastMeaningfulUpdateAt: now, lapsedAt: null },
    }),
    prisma.partner.update({ where: { id: partner.id }, data: { lastActivityAt: now } }),
  ]);

  await recordAudit({
    actorId: partner.userId,
    actorRole: "PARTNER",
    action: "ACCOUNT_ACTIVITY_LOGGED",
    entity: "RegisteredAccount",
    entityId: account.id,
    after: { kind },
  });
  safeRevalidatePath("/partner/accounts");
  safeRevalidatePath(`/partner/accounts/${account.id}`);
  return { ok: true };
}

/** Post a message to the thread under one of the partner's own opportunities. */
export async function postDealMessage(formData: FormData) {
  const { partner } = await requirePartner();
  const parsed = dealMessageSchema.safeParse({
    dealRegistrationId: formData.get("dealRegistrationId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please write a message." };
  }
  const { dealRegistrationId, body } = parsed.data;

  const reg = await prisma.dealRegistration.findFirst({
    where: { id: dealRegistrationId, partnerId: partner.id },
    select: { id: true, legalEntity: true },
  });
  if (!reg) return { ok: false, message: "That opportunity is not one of yours." };

  await prisma.dealMessage.create({
    data: {
      dealRegistrationId: reg.id,
      authorUserId: partner.userId,
      authorRole: "PARTNER",
      authorName: partner.displayName,
      body,
    },
  });
  await prisma.partner.update({ where: { id: partner.id }, data: { lastActivityAt: new Date() } });
  await notifyOwner({
    subject: `Partner replied on an opportunity: ${partner.displayName}`,
    template: "owner_deal_message",
    body: `${partner.displayName} posted a message on the opportunity for ${reg.legalEntity}.`,
    href: "/admin/partners/deal-registrations",
  });
  safeRevalidatePath(`/partner/deals/${reg.id}`);
  safeRevalidatePath("/admin/partners/deal-registrations");
  return { ok: true };
}

/**
 * Edit and resubmit an opportunity the company asked the partner to revise.
 * Only a NEEDS_REVISION registration owned by this partner can be resubmitted;
 * it returns to SUBMITTED so it re-enters the Panel Confirmation queue, and the
 * partner's summary of changes is added to the thread.
 */
export async function resubmitDealRegistration(formData: FormData) {
  const { partner } = await requirePartner();
  const parsed = resubmitDealSchema.safeParse({
    dealRegistrationId: formData.get("dealRegistrationId"),
    offering: formData.get("offering"),
    legalEntity: formData.get("legalEntity"),
    country: formData.get("country"),
    businessUnit: formData.get("businessUnit") || undefined,
    contactName: formData.get("contactName") || undefined,
    contactTitle: formData.get("contactTitle") || undefined,
    estSeats: formData.get("estSeats") || undefined,
    estValueUsd: formData.get("estValueUsd") || undefined,
    functionsIntended: formData.getAll("functionsIntended").map(String),
    justification: formData.get("justification"),
    widerScopeRequested: formData.get("widerScopeRequested") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const data = parsed.data;

  const reg = await prisma.dealRegistration.findFirst({
    where: { id: data.dealRegistrationId, partnerId: partner.id },
    select: { id: true, status: true },
  });
  if (!reg) return { ok: false, message: "That opportunity is not one of yours." };
  if (reg.status !== "NEEDS_REVISION") {
    return { ok: false, message: "Only an opportunity the company asked you to revise can be resubmitted." };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.dealRegistration.update({
      where: { id: reg.id },
      data: {
        offering: data.offering,
        legalEntity: data.legalEntity,
        country: data.country,
        businessUnit: data.businessUnit || null,
        contactName: data.contactName || null,
        contactTitle: data.contactTitle || null,
        estSeats: data.estSeats ? Number.parseInt(data.estSeats, 10) : null,
        estValueCents: data.estValueUsd ? usdToCents(Number(data.estValueUsd)) : null,
        functionsIntended: data.functionsIntended ?? [],
        justification: data.justification,
        widerScopeRequested: data.widerScopeRequested || null,
        status: "SUBMITTED",
        submittedAt: now,
        revisionRequestedAt: null,
      },
    }),
    prisma.dealMessage.create({
      data: {
        dealRegistrationId: reg.id,
        authorUserId: partner.userId,
        authorRole: "PARTNER",
        authorName: partner.displayName,
        body: data.note?.trim()
          ? `Resubmitted with changes. ${data.note.trim()}`
          : "Resubmitted with changes.",
      },
    }),
    prisma.partner.update({ where: { id: partner.id }, data: { lastActivityAt: now } }),
  ]);

  await recordAudit({
    actorId: partner.userId,
    actorRole: "PARTNER",
    action: "DEAL_REGISTRATION_RESUBMITTED",
    entity: "DealRegistration",
    entityId: reg.id,
    after: { legalEntity: data.legalEntity, country: data.country, offering: data.offering },
  });
  await notifyOwner({
    subject: `Opportunity resubmitted: ${partner.displayName}`,
    template: "owner_deal_resubmitted",
    body: `${partner.displayName} revised and resubmitted the opportunity for ${data.legalEntity}. It is awaiting Panel Confirmation again.`,
    href: "/admin/partners/deal-registrations",
  });
  safeRevalidatePath(`/partner/deals/${reg.id}`);
  safeRevalidatePath("/partner/deals");
  safeRevalidatePath("/admin/partners/deal-registrations");
  return { ok: true };
}

/**
 * Submit a request for a special arrangement beyond the standard contract. Each
 * out-of-rule detail becomes an item the superadmin can approve or reject
 * individually, so a request can end up approved, partially approved, or rejected.
 */
export async function submitSpecialDealRequest(formData: FormData) {
  const { partner } = await requirePartner();
  const items = formData
    .getAll("items")
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean);
  const rawDealId = String(formData.get("dealRegistrationId") ?? "").trim();
  const parsed = specialDealRequestSchema.safeParse({
    title: formData.get("title"),
    context: formData.get("context"),
    dealRegistrationId: rawDealId || undefined,
    items,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const data = parsed.data;

  // If a linked opportunity is named, it must belong to this partner (IDOR guard).
  let linkedDealId: string | null = null;
  if (data.dealRegistrationId) {
    const reg = await prisma.dealRegistration.findFirst({
      where: { id: data.dealRegistrationId, partnerId: partner.id },
      select: { id: true },
    });
    if (!reg) return { ok: false, message: "That opportunity is not one of yours." };
    linkedDealId = reg.id;
  }

  const request = await prisma.specialDealRequest.create({
    data: {
      partnerId: partner.id,
      dealRegistrationId: linkedDealId,
      title: data.title,
      context: data.context,
      items: {
        create: data.items.map((description, index) => ({ description, order: index })),
      },
    },
  });

  await prisma.partner.update({ where: { id: partner.id }, data: { lastActivityAt: new Date() } });
  await recordAudit({
    actorId: partner.userId,
    actorRole: "PARTNER",
    action: "SPECIAL_DEAL_REQUEST_SUBMITTED",
    entity: "SpecialDealRequest",
    entityId: request.id,
    after: { title: data.title, items: data.items.length },
  });
  await notifyOwner({
    subject: `New special request: ${partner.displayName}`,
    template: "owner_special_deal_request",
    body: `${partner.displayName} submitted a special request (${data.title}) with ${data.items.length} detail(s) to review.`,
    href: "/admin/partners/special-deals",
  });
  safeRevalidatePath("/partner/special-deals");
  safeRevalidatePath("/admin/partners/special-deals");
  return { ok: true };
}

/** Flag a query on one of the partner's own commission lines. */
export async function flagCommissionQuery(formData: FormData) {
  const { partner } = await requirePartner();
  const id = String(formData.get("commissionEntryId") ?? "");
  const note = String(formData.get("queryNote") ?? "").trim();
  if (!id) throw new Error("Missing commission entry.");

  const entry = await prisma.commissionEntry.findFirst({
    where: { id, partnerId: partner.id },
    select: { id: true },
  });
  if (!entry) throw new Error("That commission entry is not yours.");

  await prisma.commissionEntry.update({
    where: { id: entry.id },
    data: { queryFlag: true, queryNote: note || "Queried by partner." },
  });
  await recordAudit({
    actorId: partner.userId,
    actorRole: "PARTNER",
    action: "COMMISSION_QUERY_FLAGGED",
    entity: "CommissionEntry",
    entityId: entry.id,
    after: { queryNote: note },
  });
  safeRevalidatePath("/partner/commissions");
}

/** Update the partner's own display profile. */
export async function updatePartnerProfile(formData: FormData) {
  const { partner } = await requirePartner();
  const parsed = partnerProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    contactEmail: formData.get("contactEmail"),
    country: formData.get("country") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  await prisma.partner.update({
    where: { id: partner.id },
    data: {
      displayName: parsed.data.displayName,
      contactEmail: parsed.data.contactEmail,
      country: parsed.data.country || null,
    },
  });
  await recordAudit({
    actorId: partner.userId,
    actorRole: "PARTNER",
    action: "PARTNER_PROFILE_UPDATE",
    entity: "Partner",
    entityId: partner.id,
    after: { displayName: parsed.data.displayName },
  });
  safeRevalidatePath("/partner/profile");
  return { ok: true };
}
