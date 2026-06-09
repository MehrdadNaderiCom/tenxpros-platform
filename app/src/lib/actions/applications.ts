"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/authz";
import { absoluteUrl, formatCurrency } from "@/lib/utils";
import { applicationSchema, applicationStatusSchema, type ApplicationInput } from "@/lib/validations/application";
import { setPasswordSchema } from "@/lib/validations/auth";
import { safeSendEmail } from "@/lib/services/email";
import { assertApplicationTransition } from "@/lib/services/status";
import {
  assertPaymentTransition,
  parseApplicationPaymentOverride,
  resolvePaymentTerms,
  type PaymentStatus,
  type ResolvedPaymentTerms,
} from "@/lib/payment-terms";
import { dossierSections, pricingTiers } from "@/lib/program-data";

export async function submitApplication(input: ApplicationInput) {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid application." };
  }

  const data = parsed.data;
  const existing = await prisma.application.findFirst({
    where: {
      email: data.email,
      status: { notIn: ["REVISE_AND_REAPPLY", "NOT_ACCEPTED"] },
    },
    select: { id: true, status: true },
  });

  if (existing) {
    return {
      ok: false,
      message: "An active application already exists for this email. Please log in or wait for review.",
    };
  }

  const activeTier = await prisma.pricingTier.findFirst({ where: { isActive: true } });

  const application = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: data.email },
      update: { name: data.fullName, role: "APPLICANT" },
      create: { email: data.email, name: data.fullName, role: "APPLICANT" },
    });

    const created = await tx.application.create({
      data: {
        userId: user.id,
        fullName: data.fullName,
        email: data.email,
        country: data.country,
        professionalRole: data.professionalRole,
        domain: data.domain,
        linkedinUrl: data.linkedinUrl || undefined,
        aiExperience: data.aiExperience,
        whyTenXPros: data.whyTenXPros,
        realProblemBrief: data.realProblemBrief,
        dataSensitivity: data.dataSensitivity,
        timeAvailability: data.timeAvailability,
        preferredLanguage: data.preferredLanguage,
        consentConfidentiality: data.consentConfidentiality,
        consentTerms: data.consentTerms,
        pricingTierAtApply: activeTier?.tier ?? pricingTiers.find((tier) => tier.isActive)?.tier,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmTerm: data.utmTerm,
        utmContent: data.utmContent,
        referrerUrl: data.referrerUrl,
        landingPage: data.landingPage,
      },
    });

    await tx.siteEvent.create({
      data: {
        userId: user.id,
        eventType: "APPLICATION_SUBMITTED",
        eventData: { applicationId: created.id, tier: created.pricingTierAtApply },
        url: data.landingPage,
        referrer: data.referrerUrl,
      },
    });

    return created;
  });

  await safeSendEmail({
    to: application.email,
    subject: "TenXPros application received",
    template: "application_received",
    text: `Hi ${application.fullName},\\n\\nWe received your TenXPros application. The review team will assess fit, problem clarity, and readiness.\\n\\nApplication ID: ${application.id}`,
  });

  safeRevalidatePath("/admin/applications");
  return { ok: true, id: application.id };
}

export async function updateApplicationStatus(formData: FormData) {
  const admin = await requireAdminUser();
  const parsed = applicationStatusSchema.safeParse({
    applicationId: formData.get("applicationId"),
    status: formData.get("status"),
    adminNotes: formData.get("adminNotes") || undefined,
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid status update.");

  const application = await prisma.application.findUniqueOrThrow({
    where: { id: parsed.data.applicationId },
    include: { user: true },
  });
  assertApplicationTransition(application.status, parsed.data.status);

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: {
      status: parsed.data.status,
      adminNotes: parsed.data.adminNotes,
      reviewedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorRole: admin.role,
      action: "STATUS_CHANGE",
      entity: "Application",
      entityId: application.id,
      changes: { before: { status: application.status }, after: { status: updated.status } },
      metadata: { adminNotes: parsed.data.adminNotes },
    },
  });

  if (updated.status === "ACCEPTED") {
    await createPendingPaymentAndSendAcceptedEmail(updated.id);
  } else if (updated.status === "REVISE_AND_REAPPLY" || updated.status === "NOT_ACCEPTED") {
    await safeSendEmail({
      to: updated.email,
      subject: `TenXPros application update: ${updated.status.replaceAll("_", " ").toLowerCase()}`,
      template: "application_status_update",
      text: `Hi ${updated.fullName},\\n\\nYour TenXPros application status is now ${updated.status}.\\n\\nNotes:\\n${updated.adminNotes ?? "No notes provided."}`,
    });
  }

  safeRevalidatePath("/admin/applications");
  safeRevalidatePath(`/admin/applications/${application.id}`);
}

function loadTierForApplication(tierName: string) {
  return prisma.pricingTier.findFirst({
    where: { tier: tierName as "FOUNDING" | "EARLY" | "LATE" | "FINAL" | "STANDARD" },
  });
}

/**
 * Build and send the "accepted — here's how to pay" email from resolved terms.
 * Sender is hello@ (email service default); support copy is support@ (from the
 * resolver). The discount note is included ONLY when the admin marked it visible
 * to the applicant (`publicDiscountNote`). Uses safeSendEmail (never throws).
 */
async function sendPaymentInstructionsEmail(
  application: { email: string; fullName: string },
  terms: ResolvedPaymentTerms,
  subject = "TenXPros application accepted",
) {
  const lines = [
    `Hi ${application.fullName},`,
    "",
    "Your TenXPros application has been accepted.",
    "",
    `Amount due: ${formatCurrency(terms.amount, terms.currency)}`,
  ];
  if (terms.dueAt) lines.push(`Please complete payment by: ${terms.dueAt.toDateString()}`);
  lines.push("", `Payment link: ${terms.paymentLink}`);
  if (terms.paymentInstructions) lines.push("", terms.paymentInstructions);
  if (terms.publicDiscountNote) lines.push("", `Note: ${terms.publicDiscountNote}`);
  lines.push(
    "",
    `Questions about payment? Contact ${terms.supportEmail}.`,
    "",
    "After your payment is confirmed, your participant account will be activated.",
  );

  await safeSendEmail({
    to: application.email,
    subject,
    template: "application_accepted_payment_link",
    text: lines.join("\n"),
  });
}

async function createPendingPaymentAndSendAcceptedEmail(applicationId: string) {
  const application = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
  const tierName = application.pricingTierAtApply ?? "FOUNDING";
  const tierRecord = await loadTierForApplication(tierName);
  const now = new Date();

  // Snapshot tier-default amount/currency/dueAt onto a PENDING record so the
  // payments table and later edits start from sensible values. Method/link/
  // instructions stay null on the record so they resolve tier -> env at send time.
  const seed = resolvePaymentTerms({ record: null, tier: tierRecord, now });
  await prisma.paymentRecord.upsert({
    where: { id: `pending-${application.id}` },
    update: {}, // never clobber an admin's prior customization on re-accept
    create: {
      id: `pending-${application.id}`,
      applicationId: application.id,
      amount: seed.amount,
      currency: seed.currency,
      dueAt: seed.dueAt,
      status: "PENDING",
    },
  });

  // Re-read so any admin override already on the record is honored in the email.
  const record = await prisma.paymentRecord.findUnique({ where: { id: `pending-${application.id}` } });
  const terms = resolvePaymentTerms({ record, tier: tierRecord, now });
  await sendPaymentInstructionsEmail(application, terms);
}

export async function markPaymentReceivedAndEnroll(formData: FormData) {
  const admin = await requireAdminUser();
  const applicationId = String(formData.get("applicationId") ?? "");
  await enrollAcceptedApplication(applicationId, admin);
}

/**
 * Enroll an ACCEPTED application: create the participant profile, path, dossier,
 * modules, and set-password token; flip any PENDING payment to PAID; and send the
 * welcome email. Shared by "mark paid & enroll" and "waive & enroll" — a WAIVED
 * record is left untouched (only PENDING records flip to PAID).
 */
async function enrollAcceptedApplication(
  applicationId: string,
  admin: Awaited<ReturnType<typeof requireAdminUser>>,
) {
  const application = await prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: { user: true, payments: true },
  });

  if (application.status !== "ACCEPTED") {
    throw new Error("Only accepted applications can be enrolled.");
  }

  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 7);
  const expectedEndAt = new Date(startsAt);
  expectedEndAt.setDate(expectedEndAt.getDate() + 84);
  const setupToken = crypto.randomUUID();
  const tokenExpiry = new Date();
  tokenExpiry.setDate(tokenExpiry.getDate() + 7);

  const participant = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: application.userId },
      data: { role: "PARTICIPANT" },
    });

    const profile = await tx.participantProfile.create({
      data: {
        userId: application.userId,
        tier: application.pricingTierAtApply === "EARLY" ? "EARLY" : application.pricingTierAtApply === "LATE" ? "LATE" : application.pricingTierAtApply === "FINAL" ? "FINAL" : application.pricingTierAtApply === "STANDARD" ? "STANDARD" : "FOUNDING",
        startsAt,
        expectedEndAt,
        status: "ONBOARDING",
      },
    });

    await tx.programPath.create({
      data: {
        participantId: profile.id,
        customizationNotes: "Initial path pending diagnostic review.",
      },
    });

    const dossier = await tx.dossier.create({
      data: {
        participantId: profile.id,
        title: `${application.fullName} AI Solution Dossier`,
      },
    });

    await tx.dossierSection.createMany({
      data: dossierSections.map(([sectionType], index) => ({
        dossierId: dossier.id,
        sectionType,
        order: index + 1,
        content: "",
      })),
    });

    const modules = await tx.module.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
    await tx.participantModule.createMany({
      data: modules.map((module, index) => ({
        participantId: profile.id,
        moduleId: module.id,
        moduleVersion: module.version,
        status: index === 0 ? "UNLOCKED" : "LOCKED",
        unlockedAt: index === 0 ? new Date() : null,
      })),
    });

    await tx.paymentRecord.updateMany({
      where: { applicationId: application.id, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date(), participantId: profile.id },
    });

    await tx.application.update({
      where: { id: application.id },
      data: { status: "ENROLLED" },
    });

    await tx.verificationToken.deleteMany({ where: { identifier: application.email } });
    await tx.verificationToken.create({
      data: {
        identifier: application.email,
        token: setupToken,
        expires: tokenExpiry,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "ENROLL",
        entity: "Application",
        entityId: application.id,
        changes: { before: { status: application.status }, after: { status: "ENROLLED" } },
      },
    });

    return profile;
  });

  await safeSendEmail({
    to: application.email,
    subject: "Welcome to TenXPros",
    template: "enrollment_welcome",
    text: `Hi ${application.fullName},\\n\\nYour TenXPros enrollment is active. Set your password here: ${absoluteUrl(`/set-password?email=${encodeURIComponent(application.email)}&token=${encodeURIComponent(setupToken)}`)}\\n\\nYour portal opens at ${absoluteUrl("/portal")}.`,
  });

  safeRevalidatePath("/admin/applications");
  safeRevalidatePath("/admin/participants");
  safeRevalidatePath("/admin/payments");
  safeRevalidatePath(`/admin/applications/${application.id}`);
  void participant;
}

/**
 * Save admin-customized payment terms onto the application's PaymentRecord.
 * Targets the canonical `pending-<id>` record (or the most recent one), creating
 * it only once the application is accepted/enrolled. Validates all fields, audits
 * the change, and DOES NOT send any email (sending is an explicit status action).
 */
export async function upsertApplicationPaymentTerms(formData: FormData) {
  const admin = await requireAdminUser();
  const applicationId = String(formData.get("applicationId") ?? "");
  if (!applicationId) throw new Error("Missing application id.");

  const application = await prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: { payments: true },
  });

  const override = parseApplicationPaymentOverride(formData, new Date());

  const recordId = `pending-${application.id}`;
  const existing =
    application.payments.find((payment) => payment.id === recordId) ??
    application.payments.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ??
    null;

  if (!existing && application.status !== "ACCEPTED" && application.status !== "ENROLLED") {
    throw new Error("Accept the application before configuring its payment.");
  }

  const data = {
    amount: override.amount,
    currency: override.currency,
    method: override.method,
    paymentLink: override.paymentLink,
    paymentInstructions: override.paymentInstructions,
    dueAt: override.dueAt,
    discountNote: override.discountNote,
    showDiscountNoteToApplicant: override.showDiscountNoteToApplicant,
    internalNote: override.internalNote,
  };

  const saved = existing
    ? await prisma.paymentRecord.update({ where: { id: existing.id }, data })
    : await prisma.paymentRecord.create({
        data: { id: recordId, applicationId: application.id, status: "PENDING", ...data },
      });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorRole: admin.role,
      action: "UPDATE_PAYMENT_TERMS",
      entity: "PaymentRecord",
      entityId: saved.id,
      changes: {
        before: existing
          ? {
              amount: existing.amount,
              currency: existing.currency,
              method: existing.method,
              paymentLink: existing.paymentLink,
              showDiscountNoteToApplicant: existing.showDiscountNoteToApplicant,
            }
          : null,
        after: { amount: data.amount, currency: data.currency, method: data.method, paymentLink: data.paymentLink, showDiscountNoteToApplicant: data.showDiscountNoteToApplicant },
      },
    },
  });

  safeRevalidatePath(`/admin/applications/${application.id}`);
  safeRevalidatePath("/admin/payments");
}

/**
 * Apply a guarded payment-status transition to a single PaymentRecord, with a
 * timestamp side-effect, an audit entry, and revalidation. Shared by the
 * instructions-sent / waived / failed / cancelled actions.
 */
async function transitionPaymentStatus(
  formData: FormData,
  target: PaymentStatus,
  extra: Record<string, unknown> = {},
) {
  const admin = await requireAdminUser();
  const paymentRecordId = String(formData.get("paymentRecordId") ?? "");
  if (!paymentRecordId) throw new Error("Missing payment record id.");

  const record = await prisma.paymentRecord.findUniqueOrThrow({
    where: { id: paymentRecordId },
    include: { application: true },
  });

  assertPaymentTransition(record.status as PaymentStatus, target);

  await prisma.paymentRecord.update({
    where: { id: record.id },
    data: { status: target, ...extra },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorRole: admin.role,
      action: "PAYMENT_STATUS_CHANGE",
      entity: "PaymentRecord",
      entityId: record.id,
      changes: { before: { status: record.status }, after: { status: target } },
    },
  });

  if (record.applicationId) safeRevalidatePath(`/admin/applications/${record.applicationId}`);
  safeRevalidatePath("/admin/payments");
  return { admin, record };
}

/** Mark instructions sent and (re)send the resolved payment-instructions email. */
export async function markPaymentInstructionsSent(formData: FormData) {
  const { record } = await transitionPaymentStatus(formData, "INSTRUCTIONS_SENT", {
    instructionsSentAt: new Date(),
  });
  if (record.application) {
    const tierRecord = await loadTierForApplication(record.application.pricingTierAtApply ?? "FOUNDING");
    const terms = resolvePaymentTerms({ record, tier: tierRecord, now: new Date() });
    await sendPaymentInstructionsEmail(record.application, terms, "TenXPros payment instructions");
  }
}

/** Mark the payment failed (e.g. a manual transfer did not arrive). No enroll. */
export async function markPaymentFailed(formData: FormData) {
  await transitionPaymentStatus(formData, "FAILED");
}

/** Cancel the payment (e.g. applicant withdrew). No enroll. */
export async function markPaymentCancelled(formData: FormData) {
  await transitionPaymentStatus(formData, "CANCELLED", { cancelledAt: new Date() });
}

/**
 * Waive the payment, and ONLY enroll if the admin explicitly opted in via the
 * `enroll` checkbox and the application is ACCEPTED. The waived record stays
 * WAIVED through enrollment (enrollment flips PENDING records to PAID only).
 */
export async function markPaymentWaived(formData: FormData) {
  const { admin, record } = await transitionPaymentStatus(formData, "WAIVED", { waivedAt: new Date() });
  const enroll = String(formData.get("enroll") ?? "") === "on";
  if (enroll && record.application && record.application.status === "ACCEPTED") {
    await enrollAcceptedApplication(record.application.id, admin);
  }
}

export async function setParticipantPassword(formData: FormData) {
  const parsed = setPasswordSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid password setup." };
  }

  const record = await prisma.verificationToken.findFirst({
    where: {
      identifier: parsed.data.email,
      token: parsed.data.token,
      expires: { gt: new Date() },
    },
  });

  if (!record) return { ok: false, message: "This password setup link is invalid or expired." };

  await prisma.$transaction([
    prisma.user.update({
      where: { email: parsed.data.email },
      data: { passwordHash: await hash(parsed.data.password, 12), emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({
      where: { token: parsed.data.token },
    }),
  ]);

  return { ok: true };
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    if (error instanceof Error && error.message.includes("static generation store missing")) {
      return;
    }
    throw error;
  }
}
