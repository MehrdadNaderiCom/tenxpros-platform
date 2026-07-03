"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";
import { sanitizeLessonHtml, htmlToPlainText } from "@/lib/academy/lesson-html";
import { ensureLessonAudio } from "@/lib/academy/lesson-audio";

/**
 * Save a superadmin edit to a Partner Academy lesson. Sanitizes the HTML, writes
 * a version snapshot, bumps the module content version, and notifies partners:
 *
 *  - Partners who already passed: a "content updated" notice. Their pass and
 *    badge stay valid through December 31 (we do not reset them).
 *  - Partners who have not passed: they will simply complete the latest version.
 *    They are notified too so the change is not silent.
 */
export async function saveLessonContent(formData: FormData) {
  const admin = await requireSuperAdmin();
  const lessonId = String(formData.get("lessonId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const rawHtml = String(formData.get("bodyHtml") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!lessonId || !title) return;

  const bodyHtml = sanitizeLessonHtml(rawHtml);
  const audioText = htmlToPlainText(bodyHtml);

  const lesson = await prisma.academyLesson.findUniqueOrThrow({
    where: { id: lessonId },
    select: { id: true, moduleId: true },
  });

  // Bump version, snapshot, and update the lesson in one transaction.
  const newVersion = await prisma.$transaction(async (tx) => {
    const mod = await tx.academyModule.update({
      where: { id: lesson.moduleId },
      data: { contentVersion: { increment: 1 } },
      select: { contentVersion: true, title: true, slug: true },
    });
    await tx.academyLesson.update({
      where: { id: lessonId },
      data: { title, bodyHtml, audioText, updatedByEmail: admin.email },
    });
    await tx.academyLessonVersion.create({
      data: {
        lessonId,
        moduleId: lesson.moduleId,
        version: mod.contentVersion,
        title,
        bodyHtml,
        audioText,
        note,
        editedByEmail: admin.email,
      },
    });
    return mod;
  });

  // Regenerate the lesson narration for the new text in the background, so
  // the audio a partner hears never lags behind an edited lesson.
  ensureLessonAudio(lessonId, audioText);

  // Notify partners who have any progress on this module.
  const progress = await prisma.academyProgress.findMany({
    where: { moduleId: lesson.moduleId },
    select: { partnerId: true, examPassed: true },
  });
  if (progress.length) {
    const url = `/partner/academy/${newVersion.slug}`;
    await prisma.partnerNotification.createMany({
      data: progress.map((p) => ({
        partnerId: p.partnerId,
        type: "ACADEMY_CONTENT_UPDATED",
        title: `Lesson updated: ${newVersion.title}`,
        body: p.examPassed
          ? "We refreshed this lesson. Your pass and certificate stay valid through December 31, so there is nothing you must redo. Review the changes when it suits you."
          : "We updated this lesson. When you reach it you will complete the latest version.",
        url,
      })),
    });
  }

  revalidatePath("/admin/academy/content");
  revalidatePath(`/admin/academy/content/${lessonId}`);
  revalidatePath(`/partner/academy/${newVersion.slug}`);
  revalidatePath("/partner/academy");
}
