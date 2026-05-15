"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";
import { applicationSchema, applicationStatusSchema, type ApplicationInput } from "@/lib/validations/application";
import { setPasswordSchema } from "@/lib/validations/auth";
import { paymentLinkForTier, sendEmail } from "@/lib/services/email";
import { assertApplicationTransition } from "@/lib/services/status";
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

  await sendEmail({
    to: application.email,
    subject: "TenXPros application received",
    template: "application_received",
    text: `Hi ${application.fullName},\\n\\nWe received your TenXPros application. The review team will assess fit, problem clarity, and readiness.\\n\\nApplication ID: ${application.id}`,
  });

  safeRevalidatePath("/admin/applications");
  return { ok: true, id: application.id };
}

export async function updateApplicationStatus(formData: FormData) {
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
      actorRole: "ADMIN",
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
    await sendEmail({
      to: updated.email,
      subject: `TenXPros application update: ${updated.status.replaceAll("_", " ").toLowerCase()}`,
      template: "application_status_update",
      text: `Hi ${updated.fullName},\\n\\nYour TenXPros application status is now ${updated.status}.\\n\\nNotes:\\n${updated.adminNotes ?? "No notes provided."}`,
    });
  }

  safeRevalidatePath("/admin/applications");
  safeRevalidatePath(`/admin/applications/${application.id}`);
}

async function createPendingPaymentAndSendAcceptedEmail(applicationId: string) {
  const application = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
  const tier = application.pricingTierAtApply ?? "FOUNDING";
  const tierRecord = await prisma.pricingTier.findFirst({
    where: { tier: tier as "FOUNDING" | "EARLY" | "LATE" | "FINAL" | "STANDARD" },
  });

  await prisma.paymentRecord.upsert({
    where: { id: `pending-${application.id}` },
    update: {},
    create: {
      id: `pending-${application.id}`,
      applicationId: application.id,
      amount: tierRecord?.price ?? 997,
      status: "PENDING",
    },
  });

  const paymentLink = paymentLinkForTier(tier);
  await sendEmail({
    to: application.email,
    subject: "TenXPros application accepted",
    template: "application_accepted_payment_link",
    text: `Hi ${application.fullName},\\n\\nYour TenXPros application has been accepted.\\n\\nUse this manual payment link to enroll: ${paymentLink}\\n\\nAfter payment is confirmed, your participant account will be activated.`,
  });
}

export async function markPaymentReceivedAndEnroll(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
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
        actorRole: "ADMIN",
        action: "ENROLL",
        entity: "Application",
        entityId: application.id,
        changes: { before: { status: application.status }, after: { status: "ENROLLED" } },
      },
    });

    return profile;
  });

  await sendEmail({
    to: application.email,
    subject: "Welcome to TenXPros",
    template: "enrollment_welcome",
    text: `Hi ${application.fullName},\\n\\nYour TenXPros enrollment is active. Set your password here: ${absoluteUrl(`/set-password?email=${encodeURIComponent(application.email)}&token=${encodeURIComponent(setupToken)}`)}\\n\\nYour portal opens at ${absoluteUrl("/portal")}.`,
  });

  safeRevalidatePath("/admin/applications");
  safeRevalidatePath("/admin/participants");
  safeRevalidatePath(`/admin/applications/${application.id}`);
  void participant;
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
