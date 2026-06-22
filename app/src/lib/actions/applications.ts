"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/authz";
import { absoluteUrl } from "@/lib/utils";
import {
  applicationSchema,
  applicationStatusSchema,
  isPdfMagic,
  resumeFileError,
  resumeRuleError,
} from "@/lib/validations/application";
import { setPasswordSchema } from "@/lib/validations/auth";
import { safeSendEmail } from "@/lib/services/email";
import {
  applicationReceivedEmail,
  applicationStatusEmail,
  enrollmentWelcomeEmail,
  paymentInstructionsEmail,
} from "@/lib/email/templates";
import { assertApplicationTransition } from "@/lib/services/status";
import {
  assertPaymentTransition,
  parseApplicationPaymentOverride,
  resolvePaymentTerms,
  type PaymentStatus,
  type ResolvedPaymentTerms,
} from "@/lib/payment-terms";
import { dossierSections, pricingTiers } from "@/lib/program-data";

export async function submitApplication(formData: FormData) {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  const optional = (name: string) => {
    const value = text(name);
    return value.length > 0 ? value : undefined;
  };

  const parsed = applicationSchema.safeParse({
    fullName: text("fullName"),
    email: text("email"),
    country: text("country"),
    professionalRole: text("professionalRole"),
    domain: text("domain"),
    phone: text("phone"),
    linkedinUrl: text("linkedinUrl"),
    aiExperience: text("aiExperience"),
    whyTenXPros: text("whyTenXPros"),
    realProblemBrief: text("realProblemBrief"),
    dataSensitivity: text("dataSensitivity"),
    timeAvailability: text("timeAvailability"),
    preferredLanguage: text("preferredLanguage") || "English",
    consentConfidentiality: text("consentConfidentiality") === "true",
    consentTerms: text("consentTerms") === "true",
    utmSource: optional("utmSource"),
    utmMedium: optional("utmMedium"),
    utmCampaign: optional("utmCampaign"),
    utmTerm: optional("utmTerm"),
    utmContent: optional("utmContent"),
    referrerUrl: optional("referrerUrl"),
    landingPage: optional("landingPage"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid application." };
  }

  const data = parsed.data;

  // Resume PDF: required when no LinkedIn URL was provided; always validated
  // (type, size, %PDF- magic bytes) when present.
  const resumeEntry = formData.get("resume");
  const resumeFile = resumeEntry instanceof File && resumeEntry.size > 0 ? resumeEntry : null;

  const ruleError = resumeRuleError(data.linkedinUrl, Boolean(resumeFile));
  if (ruleError) return { ok: false, message: ruleError };

  let resumeBuffer: Buffer | null = null;
  if (resumeFile) {
    const fileError = resumeFileError({ type: resumeFile.type, size: resumeFile.size });
    if (fileError) return { ok: false, message: fileError };
    resumeBuffer = Buffer.from(await resumeFile.arrayBuffer());
    if (!isPdfMagic(new Uint8Array(resumeBuffer.subarray(0, 8)))) {
      return { ok: false, message: "Resume must be a valid PDF file." };
    }
  }
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
        phone: data.phone,
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

    if (resumeBuffer && resumeFile) {
      await tx.applicationResume.create({
        data: {
          applicationId: created.id,
          filename: resumeFile.name || "resume.pdf",
          mimeType: "application/pdf",
          size: resumeBuffer.length,
          data: resumeBuffer,
        },
      });
    }

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

  const receivedEmail = applicationReceivedEmail({
    fullName: application.fullName,
    applicationId: application.id,
  });
  await safeSendEmail({
    to: application.email,
    subject: receivedEmail.subject,
    template: "application_received",
    text: receivedEmail.text,
    html: receivedEmail.html,
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
    const statusEmail = applicationStatusEmail({
      fullName: updated.fullName,
      status: updated.status,
      notes: updated.adminNotes,
    });
    await safeSendEmail({
      to: updated.email,
      subject: statusEmail.subject,
      template: "application_status_update",
      text: statusEmail.text,
      html: statusEmail.html,
    });
  }

  safeRevalidatePath("/admin/applications");
  safeRevalidatePath(`/admin/applications/${application.id}`);
}

const AI_EXPERIENCE_VALUES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
const DATA_SENSITIVITY_VALUES = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
const TIME_AVAILABILITY_VALUES = ["HOURS_5", "HOURS_8", "HOURS_12_PLUS"] as const;

/** Admin edit of an application's core applicant details. Validated + audited. */
export async function updateApplicationDetails(formData: FormData) {
  const admin = await requireAdminUser();
  const applicationId = String(formData.get("applicationId") ?? "");
  if (!applicationId) throw new Error("Missing application id.");

  const existing = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const country = String(formData.get("country") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const professionalRole = String(formData.get("professionalRole") ?? "").trim();
  const domain = String(formData.get("domain") ?? "").trim();
  const linkedinUrl = String(formData.get("linkedinUrl") ?? "").trim();
  const aiExperience = String(formData.get("aiExperience") ?? "");
  const dataSensitivity = String(formData.get("dataSensitivity") ?? "");
  const timeAvailability = String(formData.get("timeAvailability") ?? "");

  if (fullName.length < 2) throw new Error("Full name is required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("A valid email is required.");
  if (country.length < 2) throw new Error("Country is required.");
  if (professionalRole.length < 2) throw new Error("Role / job function is required.");
  if (domain.length < 2) throw new Error("Field / industry is required.");
  if (linkedinUrl && !/^https?:\/\//i.test(linkedinUrl)) throw new Error("LinkedIn must be a valid URL.");
  // Optional in admin edit (legacy applications may predate the phone field).
  if (phone && !/^\+?[0-9(][0-9\s()-]{5,18}$/.test(phone)) throw new Error("Enter a valid phone number.");
  if (!(AI_EXPERIENCE_VALUES as readonly string[]).includes(aiExperience)) throw new Error("Invalid AI familiarity.");
  if (!(DATA_SENSITIVITY_VALUES as readonly string[]).includes(dataSensitivity)) throw new Error("Invalid data sensitivity.");
  if (!(TIME_AVAILABILITY_VALUES as readonly string[]).includes(timeAvailability)) throw new Error("Invalid weekly availability.");

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      fullName,
      email,
      country,
      phone: phone || null,
      professionalRole,
      domain,
      linkedinUrl: linkedinUrl || null,
      aiExperience: aiExperience as (typeof AI_EXPERIENCE_VALUES)[number],
      dataSensitivity: dataSensitivity as (typeof DATA_SENSITIVITY_VALUES)[number],
      timeAvailability: timeAvailability as (typeof TIME_AVAILABILITY_VALUES)[number],
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorRole: admin.role,
      action: "UPDATE_APPLICATION_DETAILS",
      entity: "Application",
      entityId: applicationId,
      changes: {
        before: {
          fullName: existing.fullName,
          email: existing.email,
          country: existing.country,
          phone: existing.phone,
          professionalRole: existing.professionalRole,
          domain: existing.domain,
          aiExperience: existing.aiExperience,
          dataSensitivity: existing.dataSensitivity,
          timeAvailability: existing.timeAvailability,
        },
        after: { fullName, email, country, phone, professionalRole, domain, aiExperience, dataSensitivity, timeAvailability },
      },
    },
  });

  safeRevalidatePath("/admin/applications");
  safeRevalidatePath(`/admin/applications/${applicationId}`);
}

/** Permanently delete an application and its payment records. Audited; admin only. */
export async function deleteApplication(formData: FormData) {
  const admin = await requireAdminUser();
  const applicationId = String(formData.get("applicationId") ?? "");
  if (!applicationId) throw new Error("Missing application id.");

  const application = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });

  await prisma.$transaction([
    prisma.paymentRecord.deleteMany({ where: { applicationId } }),
    prisma.application.delete({ where: { id: applicationId } }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "DELETE_APPLICATION",
        entity: "Application",
        entityId: applicationId,
        changes: {
          before: {
            fullName: application.fullName,
            email: application.email,
            status: application.status,
          },
        },
      },
    }),
  ]);

  safeRevalidatePath("/admin/applications");
  safeRevalidatePath("/admin/payments");
  redirect("/admin/applications");
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
) {
  const mail = paymentInstructionsEmail({
    fullName: application.fullName,
    amount: terms.amount,
    currency: terms.currency,
    dueAt: terms.dueAt,
    paymentLink: terms.paymentLink,
    paymentInstructions: terms.paymentInstructions,
    publicDiscountNote: terms.publicDiscountNote,
    method: terms.method,
    supportEmail: terms.supportEmail,
  });
  await safeSendEmail({
    to: application.email,
    subject: mail.subject,
    template: "application_accepted_payment_link",
    text: mail.text,
    html: mail.html,
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

  const welcomeEmail = enrollmentWelcomeEmail({
    fullName: application.fullName,
    setPasswordUrl: absoluteUrl(
      `/set-password?email=${encodeURIComponent(application.email)}&token=${encodeURIComponent(setupToken)}`,
    ),
    portalUrl: absoluteUrl("/portal"),
  });
  await safeSendEmail({
    to: application.email,
    subject: welcomeEmail.subject,
    template: "enrollment_welcome",
    text: welcomeEmail.text,
    html: welcomeEmail.html,
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
    await sendPaymentInstructionsEmail(record.application, terms);
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
