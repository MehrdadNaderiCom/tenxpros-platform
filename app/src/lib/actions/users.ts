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

  if (locked) {
    await prisma.user.update({ where: { id: userId }, data: { name: name || null } });
  } else {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("A valid email is required.");
    if (!(USER_ROLES as readonly string[]).includes(role)) throw new Error("Invalid role.");
    if (email !== existing.email) {
      const dupe = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (dupe && dupe.id !== userId) throw new Error("Another user already has that email.");
    }
    await prisma.user.update({
      where: { id: userId },
      data: { name: name || null, email, role: role as UserRoleValue },
    });
  }

  await prisma.auditLog.create({
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
  const user = await prisma.user.findUniqueOrThrow({
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

  await prisma.$transaction(async (tx) => {
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
