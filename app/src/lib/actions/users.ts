"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin, requireSuperAdmin } from "@/lib/authz";
import { safeRevalidatePath } from "@/lib/partner/revalidate";

const USER_ROLES = ["APPLICANT", "PARTICIPANT", "COACH", "ADMIN", "PARTNER"] as const;
type UserRoleValue = (typeof USER_ROLES)[number];

/**
 * Admin edit of a user's name, email and role. Super-admin only. A super-admin
 * account is protected: only its name can be changed (its email and role stay
 * locked so the owner can never be locked out of the admin panel).
 */
export async function updateUser(formData: FormData) {
  const admin = await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "");
  const existing = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  const locked = isSuperAdmin(existing.email);

  await prisma.$transaction(async (tx) => {
    if (locked) {
      await tx.user.update({ where: { id: userId }, data: { name: name || null } });
    } else {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("A valid email is required.");
      if (!(USER_ROLES as readonly string[]).includes(role)) throw new Error("Invalid role.");
      if (email !== existing.email) {
        const dupe = await tx.user.findUnique({ where: { email }, select: { id: true } });
        if (dupe && dupe.id !== userId) throw new Error("Another user already has that email.");
      }
      await tx.user.update({
        where: { id: userId },
        data: { name: name || null, email, role: role as UserRoleValue },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "USER_UPDATED",
        entity: "User",
        entityId: userId,
        changes: {
          before: { name: existing.name, email: existing.email, role: existing.role },
          after: locked ? { name: name || null } : { name: name || null, email, role },
        },
      },
    });
  });
  safeRevalidatePath(`/admin/users/${userId}`);
  safeRevalidatePath("/admin/users");
}

/** Suspend or reactivate an account without deleting any identity or history. */
export async function setUserActiveStatus(formData: FormData) {
  const admin = await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "");
  const activate = String(formData.get("activate") ?? "false") === "true";
  const reason = String(formData.get("reason") ?? "").trim();
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (!activate) {
      if (user.id === admin.id) throw new Error("You cannot suspend your own account.");
      if (isSuperAdmin(user.email)) throw new Error("A super-admin account cannot be suspended here.");
      if (reason.length < 5) throw new Error("Enter a suspension reason of at least 5 characters.");
    }
    if (user.isActive === activate) return;

    await tx.user.update({
      where: { id: userId },
      data: activate
        ? { isActive: true, suspendedAt: null, suspensionReason: null }
        : { isActive: false, suspendedAt: now, suspensionReason: reason },
    });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: activate ? "USER_REACTIVATED" : "USER_SUSPENDED",
        entity: "User",
        entityId: userId,
        changes: {
          before: { isActive: user.isActive },
          after: { isActive: activate, reason: activate ? null : reason },
        },
      },
    });
  });
  safeRevalidatePath(`/admin/users/${userId}`);
  safeRevalidatePath("/admin/users");
}

/**
 * Permanently delete a user. Super-admin only. Blocked for a super-admin account,
 * for your own account, and for any user that owns an application, participant
 * profile, or partner record (delete those via their own flows first). For a
 * "bare" user it removes the light linked rows (tickets, directory) and lets the
 * cascade clean sessions / accounts / notifications / badges; audit entries and
 * any partner link are set null.
 */
export async function deleteUser(formData: FormData) {
  const admin = await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "");
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        application: { select: { id: true } },
        participantProfile: { select: { id: true } },
        partner: { select: { id: true } },
      },
    });
    if (isSuperAdmin(user.email)) throw new Error("A super-admin account cannot be deleted here.");
    if (user.id === admin.id) throw new Error("You cannot delete your own account.");
    if (user.application || user.participantProfile || user.partner) {
      throw new Error(
        "This user owns an application, participant profile, or partner record. Delete that record first (Applications / Participants / Partners), then delete the user.",
      );
    }
    await tx.ticketMessage.deleteMany({ where: { userId } });
    await tx.ticket.deleteMany({ where: { userId } });
    await tx.directoryProfile.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "USER_DELETED",
        entity: "User",
        entityId: userId,
        changes: { before: { email: user.email, role: user.role, name: user.name } },
      },
    });
  });

  safeRevalidatePath("/admin/users");
  redirect("/admin/users");
}

/**
 * FORCE delete a user AND non-financial records they own. Partner financial
 * history is immutable: a user with any closed deal or commission must instead
 * be suspended/terminated. Other participant records (dossier, modules, path,
 * diagnostic, certification review, payments), and certification application
 * (resume, payments), plus tickets and directory entry. Destroys all of that
 * history and is irreversible; the UI requires a checkbox acknowledgement plus
 * two confirmation dialogs, and the server re-checks the acknowledgement.
 * Super-admin only. A super-admin account and your own account are protected.
 */
export async function forceDeleteUser(formData: FormData) {
  const admin = await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (String(formData.get("acknowledge") ?? "") !== "on") {
    throw new Error("You must acknowledge that this permanently deletes the user and all of their records.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        application: { select: { id: true } },
        participantProfile: { select: { id: true } },
        partner: { select: { id: true } },
      },
    });
    if (isSuperAdmin(user.email)) throw new Error("A super-admin account cannot be deleted here.");
    if (user.id === admin.id) throw new Error("You cannot delete your own account.");

    // Partner side. Lock and re-count in this same transaction: new financial
    // rows cannot race the check, and this path never issues a financial delete.
    if (user.partner) {
      const partnerId = user.partner.id;
      await tx.$queryRaw`SELECT "id" FROM "Partner" WHERE "id" = ${partnerId} FOR UPDATE`;
      const financial = await tx.partner.findUniqueOrThrow({
        where: { id: partnerId },
        select: { _count: { select: { closedDeals: true, commissions: true } } },
      });
      if (financial._count.closedDeals > 0 || financial._count.commissions > 0) {
        throw new Error(
          "This account has immutable partner financial history and cannot be force-deleted. Suspend the user and terminate the partner instead.",
        );
      }
      await tx.qualityFlag.deleteMany({ where: { partnerId } });
      await tx.partner.delete({ where: { id: partnerId } });
    }
    // Participant side (every RESTRICT child, then the profile).
    if (user.participantProfile) {
      const participantId = user.participantProfile.id;
      await tx.dossierSection.deleteMany({ where: { dossier: { participantId } } });
      await tx.dossier.deleteMany({ where: { participantId } });
      await tx.diagnosticIntake.deleteMany({ where: { participantId } });
      await tx.programPath.deleteMany({ where: { participantId } });
      await tx.participantModule.deleteMany({ where: { participantId } });
      await tx.certificationReview.deleteMany({ where: { participantId } });
      await tx.paymentRecord.deleteMany({ where: { participantId } });
      await tx.participantProfile.delete({ where: { id: participantId } });
    }
    // Certification application side (payments, then the application cascade).
    if (user.application) {
      const applicationId = user.application.id;
      await tx.paymentRecord.deleteMany({ where: { applicationId } });
      await tx.application.delete({ where: { id: applicationId } });
    }
    // User-owned light rows, then the user (cascades sessions/accounts/badges).
    await tx.ticketMessage.deleteMany({ where: { userId } });
    await tx.ticket.deleteMany({ where: { userId } });
    await tx.directoryProfile.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: "USER_FORCE_DELETED",
        entity: "User",
        entityId: userId,
        changes: {
          before: { email: user.email, role: user.role, name: user.name },
          after: { hadPartner: Boolean(user.partner), hadParticipant: Boolean(user.participantProfile), hadApplication: Boolean(user.application) },
        },
      },
    });
  });

  safeRevalidatePath("/admin/users");
  redirect("/admin/users");
}
