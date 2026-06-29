/**
 * Seed reference content (Academy, TermsVersion, newsletter groups) from a
 * validated JSON file (produced by dump-content.ts). Plain CommonJS so it runs
 * with the node and @prisma/client already in the production container:
 *   node scripts/seed-content.cjs /tmp/content.json
 * Idempotent throughout: upserts by natural key and replaces module lessons and
 * questions so a re-seed stays in sync with the content.
 */
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedAcademy(modules) {
  for (const m of modules) {
    const mod = await prisma.academyModule.upsert({
      where: { slug: m.slug },
      update: { order: m.order, title: m.title, summary: m.summary, passMark: m.passMark, examSize: m.examSize },
      create: { slug: m.slug, order: m.order, title: m.title, summary: m.summary, passMark: m.passMark, examSize: m.examSize },
    });
    await prisma.academyLesson.deleteMany({ where: { moduleId: mod.id } });
    await prisma.academyQuestion.deleteMany({ where: { moduleId: mod.id } });
    await prisma.academyLesson.create({ data: { moduleId: mod.id, order: 1, title: m.title, body: m.lesson, audioText: m.lesson } });
    let order = 1;
    for (const q of m.exercises) {
      await prisma.academyQuestion.create({ data: { moduleId: mod.id, pool: "EXERCISE", order: order++, stem: q.stem, options: q.options, correctIndex: q.correct, explanation: q.explanation } });
    }
    order = 1;
    for (const q of m.exam) {
      await prisma.academyQuestion.create({ data: { moduleId: mod.id, pool: "EXAM", order: order++, stem: q.stem, options: q.options, correctIndex: q.correct, explanation: q.explanation } });
    }
  }
  const slugs = modules.map((m) => m.slug);
  await prisma.academyModule.updateMany({ where: { slug: { notIn: slugs } }, data: { isPublished: false } });
}

async function seedTerms(versions) {
  for (const t of versions) {
    await prisma.termsVersion.updateMany({ where: { audience: t.audience, isCurrent: true }, data: { isCurrent: false } });
    await prisma.termsVersion.upsert({
      where: { year_audience: { year: t.year, audience: t.audience } },
      update: { effectiveFrom: t.effectiveFrom, effectiveTo: t.effectiveTo, bodyHtml: t.bodyHtml, changelog: t.changelog, isCurrent: true, publishedAt: new Date() },
      create: { year: t.year, audience: t.audience, effectiveFrom: t.effectiveFrom, effectiveTo: t.effectiveTo, bodyHtml: t.bodyHtml, changelog: t.changelog, isCurrent: true },
    });
  }
}

async function seedGroups(groups) {
  for (const g of groups) {
    await prisma.newsletterGroup.upsert({ where: { name: g.name }, update: { description: g.description }, create: { name: g.name, description: g.description } });
  }
}

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: node seed-content.cjs <content.json>");
  const data = JSON.parse(fs.readFileSync(path, "utf-8"));
  await seedAcademy(data.academy ?? []);
  await seedTerms(data.terms ?? []);
  await seedGroups(data.groups ?? []);
  console.log("Seeded:", { academy: (data.academy ?? []).length, terms: (data.terms ?? []).length, groups: (data.groups ?? []).length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
