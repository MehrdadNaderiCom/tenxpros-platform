"use server";

import { prisma } from "@/lib/prisma";
import {
  dealRegistrationSchema,
  partnerProfileSchema,
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
