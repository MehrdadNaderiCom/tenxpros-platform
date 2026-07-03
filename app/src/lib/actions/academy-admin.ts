"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";
import { academyBadgeSerial } from "@/lib/academy/engine";

function currentYear(): number {
  return new Date().getUTCFullYear();
}

function refresh(partnerId: string) {
  revalidatePath("/admin/partners/academy");
  revalidatePath(`/admin/partners/academy/${partnerId}`);
}

/**
 * Manually issue (or re-issue) a Partner Academy certificate for a partner,
 * valid for the current calendar year, regardless of whether they finished the
 * modules or passed the exam. One badge per partner; re-issuing refreshes it.
 */
export async function manualIssueBadge(formData: FormData) {
  await requireSuperAdmin();
  const partnerId = String(formData.get("partnerId") ?? "");
  if (!partnerId) return;
  const year = currentYear();
  const existing = await prisma.partnerAcademyBadge.findUnique({ where: { partnerId } });
  if (existing) {
    await prisma.partnerAcademyBadge.update({ where: { partnerId }, data: { year, awardedAt: new Date() } });
  } else {
    const seq = (await prisma.partnerAcademyBadge.count()) + 1;
    await prisma.partnerAcademyBadge.create({ data: { partnerId, serial: academyBadgeSerial(year, seq), year } });
  }
  refresh(partnerId);
}

/** Renew a partner's badge for the current calendar year (start-of-year renewal). */
export async function renewBadge(formData: FormData) {
  await requireSuperAdmin();
  const partnerId = String(formData.get("partnerId") ?? "");
  if (!partnerId) return;
  await prisma.partnerAcademyBadge.updateMany({ where: { partnerId }, data: { year: currentYear(), awardedAt: new Date() } });
  refresh(partnerId);
}

/** Revoke (delete) a partner's certificate. */
export async function revokeBadge(formData: FormData) {
  await requireSuperAdmin();
  const partnerId = String(formData.get("partnerId") ?? "");
  if (!partnerId) return;
  await prisma.partnerAcademyBadge.deleteMany({ where: { partnerId } });
  refresh(partnerId);
}

const COMPLETE = { lessonReadAt: new Date(0), exercisesDone: true, examPassed: true, status: "passed", bestExamScore: 100, lockedUntil: null };

/** Manually mark one module complete (or reset it) for a partner. */
export async function setModuleCompletion(formData: FormData) {
  await requireSuperAdmin();
  const partnerId = String(formData.get("partnerId") ?? "");
  const moduleId = String(formData.get("moduleId") ?? "");
  const done = String(formData.get("done") ?? "") === "1";
  if (!partnerId || !moduleId) return;
  if (done) {
    const mod = await prisma.academyModule.findUnique({ where: { id: moduleId }, select: { contentVersion: true } });
    const data = { ...COMPLETE, lessonReadAt: new Date(), passedContentVersion: mod?.contentVersion ?? 1 };
    await prisma.academyProgress.upsert({
      where: { partnerId_moduleId: { partnerId, moduleId } },
      update: data,
      create: { partnerId, moduleId, ...data },
    });
  } else {
    await prisma.academyProgress.updateMany({
      where: { partnerId, moduleId },
      data: { examPassed: false, exercisesDone: false, lessonReadAt: null, status: "available", bestExamScore: 0, passedContentVersion: null },
    });
  }
  revalidatePath(`/admin/partners/academy/${partnerId}`);
}

/** Mark every published exam-bearing module complete for a partner (full manual completion). */
export async function markAllModulesComplete(formData: FormData) {
  await requireSuperAdmin();
  const partnerId = String(formData.get("partnerId") ?? "");
  if (!partnerId) return;
  // Informational reference pages carry no exam, so an "examPassed" row for them is
  // meaningless and would break the n-of-total completion counts.
  const modules = await prisma.academyModule.findMany({
    where: { isPublished: true, isInformational: false },
    select: { id: true, contentVersion: true },
  });
  for (const m of modules) {
    const data = { ...COMPLETE, lessonReadAt: new Date(), passedContentVersion: m.contentVersion };
    await prisma.academyProgress.upsert({
      where: { partnerId_moduleId: { partnerId, moduleId: m.id } },
      update: data,
      create: { partnerId, moduleId: m.id, ...data },
    });
  }
  revalidatePath(`/admin/partners/academy/${partnerId}`);
}
