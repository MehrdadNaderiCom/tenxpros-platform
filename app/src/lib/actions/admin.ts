"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireAdminUser as requireAdmin, isProtectedSettingKey } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { badgeCatalog } from "@/lib/program-data";
import { parsePricingUpdate } from "@/lib/pricing";
import { parseTierPaymentDefaults } from "@/lib/payment-terms";
import {
  earnedRankBadgeSlugs,
  RANK_BADGE_REQUIREMENTS,
} from "@/lib/credentials/progress-badges";

export async function issueBadge(userId: string, badgeSlug: string, context?: { type: string; ref: string }) {
  await requireAdmin();
  return issueBadgeForAdmin(userId, badgeSlug, context);
}

type BadgeWriteClient = Pick<Prisma.TransactionClient, "badge" | "participantBadge" | "certificationReview">;

async function issueBadgeForAdmin(
  userId: string,
  badgeSlug: string,
  context?: { type: string; ref: string },
  client: BadgeWriteClient = prisma,
  options: { reissueExpired?: boolean } = {},
) {
  const badge = await client.badge.findUnique({ where: { slug: badgeSlug } });
  if (!badge) throw new Error(`Badge not found: ${badgeSlug}`);
  if (badge.category === "CAPSTONE") {
    const certification = await client.certificationReview.findFirst({
      where: { participant: { userId }, outcome: "CERTIFIED" },
      select: { id: true },
    });
    if (!certification) throw new Error("A capstone badge requires a current certified outcome.");
  }
  const existing = await client.participantBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
  });
  if (!existing) {
    return client.participantBadge.create({
      data: {
        userId,
        badgeId: badge.id,
        contextType: context?.type,
        contextRef: context?.ref,
      },
    });
  }

  const expired = Boolean(existing.expiresAt && existing.expiresAt <= new Date());
  const reissue =
    existing.status === "REVOKED" || (expired && options.reissueExpired !== false);
  return client.participantBadge.update({
    where: { id: existing.id },
    data: {
      status: "ACTIVE",
      revokedAt: null,
      revocationReason: null,
      contextType: context?.type,
      contextRef: context?.ref,
      // Re-certification is a new credential event: rotate the public code and
      // issuance date. Preserve the participant's private/public preference.
      ...(reissue
        ? {
            earnedAt: new Date(),
            verificationCode: randomUUID(),
            expiresAt: null,
          }
        : {}),
    },
  });
}

type ProgressBadgeClient = BadgeWriteClient &
  Pick<Prisma.TransactionClient, "participantModule" | "auditLog">;

async function syncRankBadges(
  userId: string,
  participantId: string,
  client: ProgressBadgeClient,
  now: Date,
) {
  const passed = await client.participantModule.findMany({
    where: { participantId, status: "PASSED" },
    include: { module: true },
  });
  const earned = earnedRankBadgeSlugs(passed.map((item) => item.module.number));
  const contextBySlug: Record<string, string> = {
    "rank-ai-ready-professional": "FRAME",
    "rank-ai-problem-solver-solution-designer": "DESIGN",
    "rank-future-ready-ai-solution-designer": "FULL_PROGRAM",
  };

  for (const rank of RANK_BADGE_REQUIREMENTS) {
    if (earned.has(rank.slug)) {
      await issueBadgeForAdmin(
        userId,
        rank.slug,
        { type: "RANK", ref: contextBySlug[rank.slug] },
        client,
        // Rank sync is derived maintenance, not an explicit renewal decision.
        // An eligible but expired rank must remain expired. If eligibility was
        // actually lost, its stored REVOKED state is still reissued on regain.
        { reissueExpired: false },
      );
    } else {
      await client.participantBadge.updateMany({
        where: { userId, status: "ACTIVE", badge: { slug: rank.slug } },
        data: {
          status: "REVOKED",
          revokedAt: now,
          revocationReason: "Current passed-module requirements for this rank are no longer satisfied.",
        },
      });
    }
  }
}

export async function reviewParticipantModule(formData: FormData) {
  const admin = await requireAdmin();
  const participantModuleId = String(formData.get("participantModuleId") ?? "");
  const status = String(formData.get("status") ?? "PASSED") as "PASSED" | "REVISE" | "HOLD";
  const coachFeedback = String(formData.get("coachFeedback") ?? "");
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const target = await tx.participantModule.findUniqueOrThrow({
      where: { id: participantModuleId },
      select: { participantId: true },
    });
    // Every module review for one participant shares this serialization point.
    // Without it, concurrent passes on different module rows can each derive
    // rank badges from a partial PASSED set and leave the final rank stale.
    const lockedParticipant = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "ParticipantProfile"
      WHERE "id" = ${target.participantId}
      FOR UPDATE
    `;
    if (lockedParticipant.length !== 1) throw new Error("Participant profile not found.");
    const item = await tx.participantModule.update({
      where: { id: participantModuleId },
      data: {
        status,
        coachFeedback,
        feedbackAt: now,
        feedbackBy: admin.id,
        passedAt: status === "PASSED" ? now : null,
      },
      include: { participant: true, module: true },
    });

    const moduleBadge = badgeCatalog.find((entry) => entry.name === item.module.badgeName);
    if (moduleBadge) {
      if (status === "PASSED") {
        await issueBadgeForAdmin(
          item.participant.userId,
          moduleBadge.slug,
          { type: "MODULE", ref: item.moduleId },
          tx,
        );
      } else {
        await tx.participantBadge.updateMany({
          where: {
            userId: item.participant.userId,
            status: "ACTIVE",
            badge: { slug: moduleBadge.slug },
          },
          data: {
            status: "REVOKED",
            revokedAt: now,
            revocationReason: `Module review changed to ${status}.`,
          },
        });
      }
    }
    await syncRankBadges(item.participant.userId, item.participantId, tx, now);

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "MODULE_REVIEW",
        entity: "ParticipantModule",
        entityId: item.id,
        changes: { after: { status, badgeStatus: status === "PASSED" ? "ACTIVE" : "REVOKED" } },
      },
    });
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
  // Light guard: a blank/NaN/negative estimate falls back to the default, and
  // an absurd value is clamped into a sane range.
  const hoursRaw = Number(formData.get("estimatedHours") ?? 4);
  const estimatedHours = Number.isFinite(hoursRaw) ? Math.min(1000, Math.max(0, hoursRaw)) : 4;
  await prisma.module.update({
    where: { id: moduleId },
    data: {
      title: String(formData.get("title") ?? ""),
      coreQuestion: String(formData.get("coreQuestion") ?? ""),
      description: String(formData.get("description") ?? ""),
      artifactTemplate: String(formData.get("artifactTemplate") ?? ""),
      passCriteria: String(formData.get("passCriteria") ?? ""),
      estimatedHours,
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
  const participant = await prisma.participantProfile.findUniqueOrThrow({
    where: { id: participantId },
    include: { user: { select: { name: true } } },
  });

  // The credential states the professional field the person worked in (default
  // from their application domain) and the specialization their dossier achieved
  // (prefill from the dossier title). Both are reviewer-editable here; if left
  // blank we fall back to those defaults so the credential is never bare.
  const [application, dossier] = await Promise.all([
    prisma.application.findUnique({ where: { userId: participant.userId }, select: { domain: true } }),
    prisma.dossier.findUnique({ where: { participantId }, select: { title: true } }),
  ]);
  const submittedField = String(formData.get("field") ?? "").trim();
  const submittedSpecialization = String(formData.get("specialization") ?? "").trim();
  const field = submittedField || application?.domain || null;
  const specialization = submittedSpecialization || dossier?.title || null;

  const now = new Date();
  const credential = await prisma.$transaction(async (tx) => {
    const previous = await tx.certificationReview.findUnique({
      where: { participantId },
      select: { outcome: true },
    });
    const certificateReset = outcome === "CERTIFIED" ? {} : { certificateUrl: null, badgeIssuedAt: null };
    const review = await tx.certificationReview.upsert({
      where: { participantId },
      update: {
        outcome,
        reviewerNotes,
        field,
        specialization,
        reviewedBy: admin.id,
        reviewedAt: now,
        rubricScores: { overall: outcome },
        ...certificateReset,
      },
      create: {
        participantId,
        outcome,
        reviewerNotes,
        field,
        specialization,
        reviewedBy: admin.id,
        reviewedAt: now,
        rubricScores: { overall: outcome },
        certificateUrl: null,
        badgeIssuedAt: null,
      },
    });

    await tx.participantProfile.update({
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
      await issueBadgeForAdmin(
        participant.userId,
        "capstone-certified-tenxpro-seal",
        { type: "CAPSTONE", ref: review.id },
        tx,
      );
      await tx.certificationReview.update({
        where: { id: review.id },
        data: { badgeIssuedAt: now, certificateUrl: `/certificate/${review.id}` },
      });
      await tx.directoryProfile.upsert({
        where: { userId: participant.userId },
        update: {},
        create: {
          userId: participant.userId,
          slug: `tenxpro-${participant.userId.slice(0, 8)}`,
          displayName: participant.user.name ?? "Certified TenXPro",
          // Seed the draft from the real credential: the specialization as the
          // public title and the field as the domain, not a hardcoded value.
          title: specialization ?? "Certified TenXPro",
          domain: field ?? "Professional practice",
          bio: "Directory profile draft created after certification.",
        },
      });
    } else {
      const reason = `Certification outcome changed to ${outcome}.`;
      await tx.participantBadge.updateMany({
        where: {
          userId: participant.userId,
          badge: { slug: "capstone-certified-tenxpro-seal" },
        },
        data: { status: "REVOKED", revokedAt: now, revocationReason: reason },
      });
      // A directory listing must never continue presenting someone as currently
      // certified after the underlying certification has been downgraded.
      await tx.directoryProfile.updateMany({
        where: { userId: participant.userId },
        data: { isPublic: false },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "CERTIFICATION_DECISION",
        entity: "CertificationReview",
        entityId: review.id,
        changes: {
          before: previous ? { outcome: previous.outcome } : undefined,
          after: { outcome, credentialStatus: outcome === "CERTIFIED" ? "ACTIVE" : "REVOKED" },
        },
      },
    });
    const capstone = await tx.participantBadge.findFirst({
      where: { userId: participant.userId, badge: { slug: "capstone-certified-tenxpro-seal" } },
      select: { verificationCode: true },
    });
    return { reviewId: review.id, verificationCode: capstone?.verificationCode ?? null };
  });
  safeRevalidatePath("/admin/certifications");
  safeRevalidatePath(`/certificate/${credential.reviewId}`);
  if (credential.verificationCode) safeRevalidatePath(`/verify/${credential.verificationCode}`);
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

export async function updatePricingTier(formData: FormData) {
  const admin = await requireAdmin();
  const tierId = String(formData.get("tierId") ?? "");
  if (!tierId) throw new Error("Missing pricing tier id.");

  // Validate price + membersLimit (positive whole numbers under a sanity ceiling).
  const { price, membersLimit } = parsePricingUpdate({
    price: formData.get("price"),
    membersLimit: formData.get("membersLimit"),
  });

  const existing = await prisma.pricingTier.findUnique({ where: { id: tierId } });
  if (!existing) throw new Error("Pricing tier not found.");

  await prisma.$transaction([
    prisma.pricingTier.update({ where: { id: tierId }, data: { price, membersLimit } }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "UPDATE_PRICING_TIER",
        entity: "PricingTier",
        entityId: tierId,
        changes: {
          before: { price: existing.price, membersLimit: existing.membersLimit },
          after: { price, membersLimit },
        },
      },
    }),
  ]);

  // public /pricing reads these tiers, so revalidate it too.
  safeRevalidatePath("/admin/pricing");
  safeRevalidatePath("/pricing");
}

export async function updatePricingTierPaymentTerms(formData: FormData) {
  const admin = await requireAdmin();
  const tierId = String(formData.get("tierId") ?? "");
  if (!tierId) throw new Error("Missing pricing tier id.");

  // Validate the default payment terms. Price and capacity are NOT touched here.
  const terms = parseTierPaymentDefaults(formData);

  const existing = await prisma.pricingTier.findUnique({ where: { id: tierId } });
  if (!existing) throw new Error("Pricing tier not found.");

  await prisma.$transaction([
    prisma.pricingTier.update({ where: { id: tierId }, data: terms }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "UPDATE_TIER_PAYMENT_TERMS",
        entity: "PricingTier",
        entityId: tierId,
        changes: {
          before: {
            paymentMethod: existing.paymentMethod,
            paymentCurrency: existing.paymentCurrency,
            paymentLink: existing.paymentLink,
            paymentInstructions: existing.paymentInstructions,
            paymentDueDays: existing.paymentDueDays,
          },
          after: terms,
        },
      },
    }),
  ]);

  safeRevalidatePath("/admin/pricing");
  safeRevalidatePath("/pricing");
  safeRevalidatePath("/admin/payments");
}

export async function updateAdminSetting(formData: FormData) {
  const admin = await requireAdmin();
  const key = String(formData.get("key") ?? "");
  // Secrets and marketing config are managed only through their dedicated,
  // tighter-gated actions.
  if (isProtectedSettingKey(key)) throw new Error("This setting is managed from its own settings panel.");
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
