import type { PrismaClient } from "@prisma/client";
import { ACADEMY_MODULES } from "./academy/modules";
import type { ModuleSeed } from "./academy/content-types";
import { normalizeStem } from "../../src/lib/academy/engine";
import { sanitizeLessonHtml, htmlToPlainText } from "../../src/lib/academy/lesson-html";

/**
 * Validate the Academy content before any write. Enforces Section 5.4: a stem
 * never appears in both pools of a module, and no normalized stem repeats across
 * any two modules. Also checks each question has four options and a valid correct
 * index, and the spec shape of six exercise and twelve exam questions. Throws on
 * any violation so the seed fails loudly.
 */
export function validateAcademyContent(modules: ModuleSeed[]): void {
  const errors: string[] = [];
  const globalStems = new Map<string, string>(); // normalized stem -> moduleSlug

  for (const m of modules) {
    if (m.isInformational) {
      // Informational modules carry a lesson but no exam or exercises.
      if (m.exercises.length > 0) errors.push(`${m.slug}: informational module must have no exercises, found ${m.exercises.length}`);
      if (m.exam.length > 0) errors.push(`${m.slug}: informational module must have no exam, found ${m.exam.length}`);
    } else {
      if (m.exercises.length !== 6) errors.push(`${m.slug}: expected 6 exercise questions, found ${m.exercises.length}`);
      if (m.exam.length !== 12) errors.push(`${m.slug}: expected 12 exam questions, found ${m.exam.length}`);
    }

    const all = [...m.exercises.map((q) => ({ q, pool: "EXERCISE" })), ...m.exam.map((q) => ({ q, pool: "EXAM" }))];
    const perModule = new Map<string, string>(); // normalized stem -> pool (within this module)

    for (const { q, pool } of all) {
      if (q.options.length !== 4) errors.push(`${m.slug}: a question does not have exactly four options: ${q.stem.slice(0, 60)}`);
      if (q.correct < 0 || q.correct > 3) errors.push(`${m.slug}: correct index out of range: ${q.stem.slice(0, 60)}`);
      const key = normalizeStem(q.stem);
      // No stem in both pools of the same module.
      const seenPool = perModule.get(key);
      if (seenPool && seenPool !== pool) errors.push(`${m.slug}: stem appears in both pools: ${q.stem.slice(0, 60)}`);
      if (seenPool === pool) errors.push(`${m.slug}: duplicate stem within ${pool}: ${q.stem.slice(0, 60)}`);
      perModule.set(key, pool);
      // No stem repeats across modules.
      const seenModule = globalStems.get(key);
      if (seenModule && seenModule !== m.slug) {
        errors.push(`stem repeats across modules (${seenModule} and ${m.slug}): ${q.stem.slice(0, 60)}`);
      }
      globalStems.set(key, m.slug);
    }
  }

  // No two em or en dashes anywhere in shipped content.
  for (const m of modules) {
    const blob = [m.title, m.summary, m.lesson, ...m.exercises.flatMap((q) => [q.stem, ...q.options, q.explanation]), ...m.exam.flatMap((q) => [q.stem, ...q.options, q.explanation])].join("\n");
    if (/[\u2014\u2013]/.test(blob)) errors.push(`${m.slug}: contains an em or en dash`);
  }

  if (errors.length > 0) {
    throw new Error(`Academy content integrity check failed:\n - ${errors.join("\n - ")}`);
  }
}

/** Seed (idempotent) all Academy modules, lessons, and question banks. */
export async function seedAcademy(prisma: PrismaClient): Promise<void> {
  validateAcademyContent(ACADEMY_MODULES);

  for (const m of ACADEMY_MODULES) {
    const mod = await prisma.academyModule.upsert({
      where: { slug: m.slug },
      update: { order: m.order, title: m.title, summary: m.summary, passMark: m.passMark, examSize: m.examSize, isInformational: m.isInformational ?? false },
      create: { slug: m.slug, order: m.order, title: m.title, summary: m.summary, passMark: m.passMark, examSize: m.examSize, isInformational: m.isInformational ?? false },
    });

    // Build the rich body (if authored) and derive the audio text from it.
    const bodyHtml = m.bodyHtml ? sanitizeLessonHtml(m.bodyHtml) : null;
    const audioText = bodyHtml ? htmlToPlainText(bodyHtml) : m.lesson;

    // Preserve a superadmin-edited lesson (module contentVersion bumped past 1).
    // Otherwise keep the canonical seed content in sync.
    const existingLesson = await prisma.academyLesson.findFirst({ where: { moduleId: mod.id, order: 1 } });
    const edited = mod.contentVersion > 1;
    if (existingLesson) {
      if (!edited) {
        await prisma.academyLesson.update({
          where: { id: existingLesson.id },
          data: { title: m.title, body: m.lesson, audioText, bodyHtml },
        });
      }
    } else {
      await prisma.academyLesson.create({
        data: { moduleId: mod.id, order: 1, title: m.title, body: m.lesson, audioText, bodyHtml },
      });
    }
    // Questions are never edited from the content manager, so keep them in sync.
    await prisma.academyQuestion.deleteMany({ where: { moduleId: mod.id } });

    const questions = [
      ...m.exercises.map((q, i) => ({ ...q, pool: "EXERCISE" as const, order: i + 1 })),
      ...m.exam.map((q, i) => ({ ...q, pool: "EXAM" as const, order: i + 1 })),
    ];
    for (const q of questions) {
      await prisma.academyQuestion.create({
        data: {
          moduleId: mod.id,
          pool: q.pool,
          order: q.order,
          stem: q.stem,
          options: q.options,
          correctIndex: q.correct,
          explanation: q.explanation,
        },
      });
    }
  }

  // Unpublish any module no longer in the content set (keeps the panel clean).
  const slugs = ACADEMY_MODULES.map((m) => m.slug);
  await prisma.academyModule.updateMany({ where: { slug: { notIn: slugs } }, data: { isPublished: false } });
}
