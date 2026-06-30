/**
 * Dump the ENTIRE Partner Academy straight from the (production) database as one
 * JSON document: every module with all stored fields, its lesson(s) including the
 * exact stored bodyHtml/body/audioText, and every question (exercise and exam)
 * with options, correct index, and explanation, in order. Run inside the
 * container so it talks to the real database:
 *   node scripts/dump-academy-db.cjs > /tmp/academy.json
 * Read-only: no writes.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const modules = await prisma.academyModule.findMany({
    orderBy: { order: "asc" },
    include: {
      lessons: { orderBy: { order: "asc" } },
      questions: { orderBy: [{ pool: "asc" }, { order: "asc" }] },
    },
  });
  const out = {
    exportedFrom: "production-database",
    moduleCount: modules.length,
    modules: modules.map((m) => ({
      id: m.id,
      slug: m.slug,
      order: m.order,
      title: m.title,
      summary: m.summary,
      passMark: m.passMark,
      examSize: m.examSize,
      examCooldownHours: m.examCooldownHours,
      isPublished: m.isPublished,
      contentVersion: m.contentVersion,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      lessons: m.lessons.map((l) => ({
        order: l.order,
        title: l.title,
        body: l.body,
        audioText: l.audioText,
        bodyHtml: l.bodyHtml,
        updatedAt: l.updatedAt,
        updatedByEmail: l.updatedByEmail,
      })),
      exercises: m.questions
        .filter((q) => q.pool === "EXERCISE")
        .map((q) => ({ order: q.order, stem: q.stem, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation })),
      exam: m.questions
        .filter((q) => q.pool === "EXAM")
        .map((q) => ({ order: q.order, stem: q.stem, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation })),
    })),
  };
  process.stdout.write(JSON.stringify(out));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
