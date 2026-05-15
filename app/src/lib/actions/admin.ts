"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { badgeCatalog } from "@/lib/program-data";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") throw new Error("Admin access required.");
  return session.user;
}

export async function issueBadge(userId: string, badgeSlug: string, context?: { type: string; ref: string }) {
  const badge = await prisma.badge.findUnique({ where: { slug: badgeSlug } });
  if (!badge) throw new Error(`Badge not found: ${badgeSlug}`);
  return prisma.participantBadge.upsert({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
    update: { isPublic: true, contextType: context?.type, contextRef: context?.ref },
    create: {
      userId,
      badgeId: badge.id,
      contextType: context?.type,
      contextRef: context?.ref,
    },
  });
}

async function issueRankBadges(userId: string, participantId: string) {
  const passed = await prisma.participantModule.findMany({
    where: { participantId, status: "PASSED" },
    include: { module: true },
  });
  const passedNumbers = new Set(passed.map((item) => item.module.number));
  if ([1, 2, 3, 4].every((number) => passedNumbers.has(number))) {
    await issueBadge(userId, "rank-ai-ready-professional", { type: "RANK", ref: "FRAME" });
  }
  if ([1, 2, 3, 4, 5, 6, 7, 8].every((number) => passedNumbers.has(number))) {
    await issueBadge(userId, "rank-ai-problem-solver-solution-designer", { type: "RANK", ref: "DESIGN" });
  }
  if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].every((number) => passedNumbers.has(number))) {
    await issueBadge(userId, "rank-future-ready-ai-solution-designer", { type: "RANK", ref: "FULL_PROGRAM" });
  }
}

export async function reviewParticipantModule(formData: FormData) {
  const admin = await requireAdmin();
  const participantModuleId = String(formData.get("participantModuleId") ?? "");
  const status = String(formData.get("status") ?? "PASSED") as "PASSED" | "REVISE" | "HOLD";
  const coachFeedback = String(formData.get("coachFeedback") ?? "");
  const item = await prisma.participantModule.update({
    where: { id: participantModuleId },
    data: {
      status,
      coachFeedback,
      feedbackAt: new Date(),
      feedbackBy: admin.id,
      passedAt: status === "PASSED" ? new Date() : null,
    },
    include: { participant: true, module: true },
  });

  if (status === "PASSED") {
    const badge = badgeCatalog.find((entry) => entry.name === item.module.badgeName);
    if (badge) await issueBadge(item.participant.userId, badge.slug, { type: "MODULE", ref: item.moduleId });
    await issueRankBadges(item.participant.userId, item.participantId);
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorRole: admin.role,
      action: "MODULE_REVIEW",
      entity: "ParticipantModule",
      entityId: item.id,
      changes: { after: { status } },
    },
  });
  safeRevalidatePath("/admin/participants");
}

export async function approvePath(formData: FormData) {
  const admin = await requireAdmin();
  const pathId = String(formData.get("pathId") ?? "");
  await prisma.programPath.update({
    where: { id: pathId },
    data: {
      customizationNotes: String(formData.get("customizationNotes") ?? ""),
      approvedByAdmin: true,
      approvedAt: new Date(),
    },
  });
  await prisma.auditLog.create({
    data: { actorId: admin.id, actorRole: admin.role, action: "APPROVE_PATH", entity: "ProgramPath", entityId: pathId },
  });
  safeRevalidatePath("/admin/paths");
}

export async function saveModuleLibraryItem(formData: FormData) {
  await requireAdmin();
  const moduleId = String(formData.get("moduleId") ?? "");
  await prisma.module.update({
    where: { id: moduleId },
    data: {
      title: String(formData.get("title") ?? ""),
      coreQuestion: String(formData.get("coreQuestion") ?? ""),
      description: String(formData.get("description") ?? ""),
      artifactTemplate: String(formData.get("artifactTemplate") ?? ""),
      passCriteria: String(formData.get("passCriteria") ?? ""),
      estimatedHours: Number(formData.get("estimatedHours") ?? 4),
    },
  });
  safeRevalidatePath("/admin/modules");
}

export async function reviewDossierSection(formData: FormData) {
  const admin = await requireAdmin();
  const sectionId = String(formData.get("sectionId") ?? "");
  const status = String(formData.get("status") ?? "REVIEWED") as "REVIEWED" | "APPROVED" | "REVISED";
  const content = String(formData.get("content") ?? "");
  await prisma.$transaction([
    prisma.feedback.create({
      data: {
        dossierSectionId: sectionId,
        type: status === "APPROVED" ? "APPROVAL" : status === "REVISED" ? "REVISION_REQUEST" : "GENERAL",
        content,
        authorId: admin.id,
        authorName: admin.name ?? admin.email ?? "Admin",
      },
    }),
    prisma.dossierSection.update({
      where: { id: sectionId },
      data: { status, reviewedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: { actorId: admin.id, actorRole: admin.role, action: "DOSSIER_REVIEW", entity: "DossierSection", entityId: sectionId },
    }),
  ]);
  safeRevalidatePath("/admin/dossiers");
}

export async function respondToTicket(formData: FormData) {
  const admin = await requireAdmin();
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "");
  const status = String(formData.get("status") ?? "AWAITING_PARTICIPANT") as "AWAITING_PARTICIPANT" | "RESOLVED" | "CLOSED";
  await prisma.$transaction([
    prisma.ticketMessage.create({ data: { ticketId, userId: admin.id, body } }),
    prisma.ticket.update({ where: { id: ticketId }, data: { status, closedAt: status === "CLOSED" ? new Date() : null } }),
  ]);
  safeRevalidatePath("/admin/tickets");
}

export async function decideCertification(formData: FormData) {
  const admin = await requireAdmin();
  const participantId = String(formData.get("participantId") ?? "");
  const outcome = String(formData.get("outcome") ?? "CERTIFIED") as
    | "CERTIFIED"
    | "CONDITIONALLY_CERTIFIED"
    | "COMPLETED_NOT_CERTIFIED"
    | "NOT_COMPLETED";
  const reviewerNotes = String(formData.get("reviewerNotes") ?? "");
  const participant = await prisma.participantProfile.findUniqueOrThrow({ where: { id: participantId } });
  const review = await prisma.certificationReview.upsert({
    where: { participantId },
    update: {
      outcome,
      reviewerNotes,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
      rubricScores: { overall: outcome },
    },
    create: {
      participantId,
      outcome,
      reviewerNotes,
      reviewedBy: admin.id,
      rubricScores: { overall: outcome },
    },
  });

  await prisma.participantProfile.update({
    where: { id: participantId },
    data: {
      status:
        outcome === "CERTIFIED"
          ? "CERTIFIED"
          : outcome === "CONDITIONALLY_CERTIFIED"
            ? "CONDITIONALLY_CERTIFIED"
            : outcome === "COMPLETED_NOT_CERTIFIED"
              ? "COMPLETED_NOT_CERTIFIED"
              : "NOT_COMPLETED",
    },
  });

  if (outcome === "CERTIFIED") {
    await issueBadge(participant.userId, "capstone-certified-tenxpro-seal", { type: "CAPSTONE", ref: review.id });
    await prisma.directoryProfile.upsert({
      where: { userId: participant.userId },
      update: {},
      create: {
        userId: participant.userId,
        slug: `tenxpro-${participant.userId.slice(0, 8)}`,
        displayName: "Certified TenXPro",
        title: "Certified TenXPro",
        domain: "AI adoption",
        bio: "Directory profile draft created after certification.",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorRole: admin.role,
      action: "CERTIFICATION_DECISION",
      entity: "CertificationReview",
      entityId: review.id,
      changes: { after: { outcome } },
    },
  });
  safeRevalidatePath("/admin/certifications");
}

export async function setActivePricingTier(formData: FormData) {
  const admin = await requireAdmin();
  const tierId = String(formData.get("tierId") ?? "");
  await prisma.$transaction([
    prisma.pricingTier.updateMany({ data: { isActive: false, closedAt: new Date() } }),
    prisma.pricingTier.update({ where: { id: tierId }, data: { isActive: true, openedAt: new Date(), closedAt: null } }),
    prisma.auditLog.create({
      data: { actorId: admin.id, actorRole: admin.role, action: "SET_ACTIVE_TIER", entity: "PricingTier", entityId: tierId },
    }),
  ]);
  safeRevalidatePath("/admin/pricing");
}

export async function updateAdminSetting(formData: FormData) {
  const admin = await requireAdmin();
  const key = String(formData.get("key") ?? "");
  await prisma.adminSetting.update({
    where: { key },
    data: { value: String(formData.get("value") ?? ""), updatedBy: admin.id },
  });
  safeRevalidatePath("/admin/settings");
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    if (error instanceof Error && error.message.includes("static generation store missing")) return;
    throw error;
  }
}
