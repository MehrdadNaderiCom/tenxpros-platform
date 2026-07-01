/**
 * Generate the reviewer-friendly Academy Review Workbook: for every module and
 * every content section, a checkbox row (Keep / Rewrite / Remove / Needs
 * screenshot / Needs legal review) and a Notes field. Sections are read from the
 * source of truth (each module's bodyHtml H2 headings) so the workbook always
 * matches the live content.
 *
 *   pnpm exec tsx scripts/generate-academy-workbook.ts > <out>.md
 */
import { ACADEMY_MODULES } from "../prisma/seed/academy/modules";
import { sanitizeLessonHtml } from "../src/lib/academy/lesson-html";

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function sectionsOf(html: string): string[] {
  return [...html.matchAll(/<\s*h2\b[^>]*>([\s\S]*?)<\s*\/\s*h2\s*>/gi)].map((m) => decode(m[1]));
}

function reviewBlock(): string {
  return [
    "- [ ] Keep",
    "- [ ] Rewrite",
    "- [ ] Remove",
    "- [ ] Needs screenshot",
    "- [ ] Needs legal review",
    "- Notes: ",
    "",
  ].join("\n");
}

const out: string[] = [];
out.push("# Partner Academy Review Workbook");
out.push("");
out.push("A reviewer worksheet covering every module and every content section. For each item, tick one disposition (Keep, Rewrite, or Remove), tick any flag that applies (Needs screenshot, Needs legal review), and write notes. Sections are generated from the live lesson content, so this workbook matches what partners actually see. Pair it with the full export in `docs/academy/partner-academy-review-package.md`.");
out.push("");
out.push("**Legend.** Keep = ship as is. Rewrite = wording/structure needs work. Remove = cut this section. Needs screenshot = a form-preview placeholder must be replaced with a real image. Needs legal review = claims, disclaimers, or terms a lawyer should confirm.");
out.push("");
out.push("## Global review (applies to the whole Academy)");
out.push("");
out.push("- [ ] Tone is consistent across all 17 modules (plain, confident, no hype)");
out.push("- [ ] No promises of jobs, income, certification, or outcomes anywhere");
out.push("- [ ] Pro / TenXPro definition is consistent everywhere it appears");
out.push("- [ ] All form-preview placeholders have a plan for real screenshots");
out.push("- [ ] Disclaimers and any regulated-field language reviewed by legal");
out.push("- [ ] Exam answers and explanations are factually correct");
out.push("- Notes: ");
out.push("");

for (const m of ACADEMY_MODULES) {
  const sections = m.bodyHtml ? sectionsOf(sanitizeLessonHtml(m.bodyHtml)) : [];
  out.push("---");
  out.push("");
  out.push(`## Module ${m.order}: ${m.title}`);
  out.push("");
  out.push(`Slug \`${m.slug}\` | Pass mark ${m.passMark}% | ${m.exercises.length} exercises | ${m.exam.length} exam questions | Content version v1`);
  out.push("");
  out.push("### Module-level review");
  out.push("");
  out.push(reviewBlock());
  out.push("### Lesson sections (rich content)");
  out.push("");
  if (sections.length === 0) {
    out.push("_No rich-content sections detected for this module._");
    out.push("");
  } else {
    sections.forEach((s, i) => {
      out.push(`#### ${m.order}.${i + 1} Section: ${s}`);
      out.push("");
      out.push(reviewBlock());
    });
  }
  out.push("### Plain lesson prose (audio text)");
  out.push("");
  out.push(reviewBlock());
  out.push(`### Exercises (${m.exercises.length} questions)`);
  out.push("");
  out.push(reviewBlock());
  out.push(`### Final exam pool (${m.exam.length} questions)`);
  out.push("");
  out.push(reviewBlock());
}

process.stdout.write(out.join("\n"));
