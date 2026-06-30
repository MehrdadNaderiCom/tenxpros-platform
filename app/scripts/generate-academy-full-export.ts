/**
 * Build the COMPLETE Partner Academy export from the exact production data
 * (dump-academy-db.cjs output). Emits a single combined Markdown file with a
 * generated table of contents, plus per-module split files and an appendix, into
 * an output directory. Nothing is summarized or omitted.
 *
 *   pnpm exec tsx scripts/generate-academy-full-export.ts <academy-prod.json> <outDir>
 */
import * as fs from "fs";
import * as path from "path";
import { badgeCatalog, modules as programModules } from "../src/lib/program-data";
import { PRO_DEFINITION } from "../src/lib/marketing/pro-definition";

const LETTER = ["A", "B", "C", "D"];
const jsonPath = process.argv[2];
const outDir = process.argv[3];
if (!jsonPath || !outDir) throw new Error("Usage: generate-academy-full-export.ts <json> <outDir>");
const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

// ---- HTML -> Markdown (keeps all text; handles our full allowlisted tag set) ----
function decode(s: string): string {
  return s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function inline(html: string): string {
  return decode(
    html
      .replace(/<\s*br\s*\/?>/gi, "  \n")
      .replace(/<\s*(strong|b)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, "**$2**")
      .replace(/<\s*(em|i)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, "*$2*")
      .replace(/<\s*code\s*>([\s\S]*?)<\s*\/\s*code\s*>/gi, "`$1`")
      .replace(/<\s*a\b[^>]*href\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\s*\/\s*a\s*>/gi, "[$2]($1)")
      .replace(/<[^>]+>/g, ""),
  ).replace(/[ \t]+/g, " ").trim();
}
function listItems(listHtml: string, ordered: boolean): string {
  const items = [...listHtml.matchAll(/<\s*li\b[^>]*>([\s\S]*?)<\s*\/\s*li\s*>/gi)].map((m) => inline(m[1]));
  return items.map((t, i) => `${ordered ? `${i + 1}.` : "-"} ${t}`).join("\n");
}
function tableToMd(tableHtml: string): string {
  const headMatch = tableHtml.match(/<\s*thead\s*>([\s\S]*?)<\s*\/\s*thead\s*>/i);
  const bodyHtml = tableHtml.match(/<\s*tbody\s*>([\s\S]*?)<\s*\/\s*tbody\s*>/i)?.[1] ?? tableHtml;
  const cells = (rowHtml: string) => [...rowHtml.matchAll(/<\s*t[hd]\b[^>]*>([\s\S]*?)<\s*\/\s*t[hd]\s*>/gi)].map((m) => inline(m[1]).replace(/\|/g, "\\|"));
  let header: string[];
  let rows: string[][];
  if (headMatch) {
    header = cells(headMatch[1]);
    rows = [...bodyHtml.matchAll(/<\s*tr\s*>([\s\S]*?)<\s*\/\s*tr\s*>/gi)].map((m) => cells(m[1]));
  } else {
    const all = [...bodyHtml.matchAll(/<\s*tr\s*>([\s\S]*?)<\s*\/\s*tr\s*>/gi)].map((m) => cells(m[1]));
    header = all[0] ?? [];
    rows = all.slice(1);
  }
  const cols = Math.max(header.length, ...rows.map((r) => r.length), 1);
  const pad = (r: string[]) => Array.from({ length: cols }, (_, i) => r[i] ?? "");
  return [`| ${pad(header).join(" | ")} |`, `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`, ...rows.map((r) => `| ${pad(r).join(" | ")} |`)].join("\n");
}
function innerBlocks(s: string): string {
  return s
    .replace(/<\s*h2\b[^>]*>([\s\S]*?)<\s*\/\s*h2\s*>/gi, (_m, t) => `\n\n##### ${inline(t)}\n`)
    .replace(/<\s*h3\b[^>]*>([\s\S]*?)<\s*\/\s*h3\s*>/gi, (_m, t) => `\n\n###### ${inline(t)}\n`)
    .replace(/<\s*h4\b[^>]*>([\s\S]*?)<\s*\/\s*h4\s*>/gi, (_m, t) => `\n\n**${inline(t)}**\n`)
    .replace(/<\s*ul\b[^>]*>([\s\S]*?)<\s*\/\s*ul\s*>/gi, (_m, t) => `\n${listItems(t, false)}\n`)
    .replace(/<\s*ol\b[^>]*>([\s\S]*?)<\s*\/\s*ol\s*>/gi, (_m, t) => `\n${listItems(t, true)}\n`)
    .replace(/<\s*blockquote\b[^>]*>([\s\S]*?)<\s*\/\s*blockquote\s*>/gi, (_m, t) => `\n> ${inline(t)}\n`)
    .replace(/<\s*hr\s*\/?>/gi, "\n\n---\n\n")
    .replace(/<\s*p\b[^>]*>([\s\S]*?)<\s*\/\s*p\s*>/gi, (_m, t) => `\n\n${inline(t)}\n`)
    .replace(/<\s*\/?div[^>]*>/gi, "")
    .replace(/[ \t]*\n[ \t]*/g, "\n");
}
function htmlToMd(html: string): string {
  let s = html;
  const blocks: string[] = [];
  // Token has no whitespace, so the later whitespace-collapse in innerBlocks cannot
  // strip its delimiters and break the restore.
  const stash = (md: string) => { blocks.push(md); return `@@STASH${blocks.length - 1}@@`; };
  s = s.replace(/<\s*table\b[\s\S]*?<\s*\/\s*table\s*>/gi, (m) => "\n\n" + stash(tableToMd(m)) + "\n\n");
  s = s.replace(/<div\s+class="callout([^"]*)"\s*>([\s\S]*?)<\s*\/div\s*>/gi, (_m, _cls, inner) => "\n\n" + stash(innerBlocks(inner).trim().split("\n").map((l) => (l.trim() ? `> ${l}` : ">")).join("\n")) + "\n\n");
  s = s.replace(/<div\s+class="form-preview"\s*>([\s\S]*?)<\s*\/div\s*>/gi, (_m, inner) => {
    const lbl = /<div\s+class="form-preview-label"\s*>([\s\S]*?)<\s*\/div\s*>/i.exec(inner)?.[1] ?? "Form preview";
    const rest = inner.replace(/<div\s+class="form-preview-label"\s*>[\s\S]*?<\s*\/div\s*>/i, "");
    return "\n\n" + stash(`> **${inline(lbl)}:**\n` + innerBlocks(rest).trim().split("\n").map((l) => `> ${l}`).join("\n")) + "\n\n";
  });
  s = innerBlocks(s);
  s = s.replace(/@@STASH(\d+)@@/g, (_m, i) => blocks[Number(i)]);
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

// ---- Extractors for explicit fields ----
function extractSection(html: string, heading: RegExp): string | null {
  const re = new RegExp(`<h2[^>]*>\\s*(?:${heading.source})\\s*</h2>([\\s\\S]*?)(?=<h2|$)`, "i");
  const m = re.exec(html);
  return m ? m[1] : null;
}
function objectivesOf(html: string): string {
  const sec = extractSection(html, /what you will be able to do/i);
  if (!sec) return "_See the lesson body for the learning objective._";
  const ul = /<ul\b[^>]*>([\s\S]*?)<\/ul>/i.exec(sec);
  if (ul) return listItems(ul[1], false);
  return inline(sec);
}
function snippetsOf(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<div\s+class="callout callout-success"\s*>([\s\S]*?)<\/div>/gi)) out.push("SAY: " + inline(m[1]));
  for (const m of html.matchAll(/<div\s+class="callout callout-warning"\s*>([\s\S]*?)<\/div>/gi)) out.push("AVOID/NOTE: " + inline(m[1]));
  const tp = extractSection(html, /talking points/i);
  if (tp) {
    const ul = /<ul\b[^>]*>([\s\S]*?)<\/ul>/i.exec(tp);
    if (ul) for (const li of ul[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) out.push("TALKING POINT: " + inline(li[1]));
  }
  return out;
}

function renderQuestion(kind: string, n: number, q: any): string {
  const opts = (q.options as string[]).map((o, i) => `- ${LETTER[i]}. ${o}${i === q.correctIndex ? "  **(correct)**" : ""}`).join("\n");
  return [`**${kind} ${n}.** ${q.stem}`, "", opts, "", `**Answer:** ${LETTER[q.correctIndex]}. ${(q.options as string[])[q.correctIndex]}`, "", `**Explanation:** ${q.explanation}`].join("\n");
}

// ---- Metadata helpers ----
function dependency(order: number): string {
  return order <= 1 ? "Unlocked by default (first module)." : `Unlocks after Module ${order - 1} is passed (sequential gating).`;
}

// ---- Per-module Markdown ----
function moduleMd(m: any, withAnchor: boolean): string {
  const html = m.lessons[0]?.bodyHtml ?? "";
  const L: string[] = [];
  if (withAnchor) L.push(`<a id="m${m.order}"></a>`);
  L.push(`## Module ${m.order}: ${m.title}`, "");
  if (withAnchor) L.push(`<a id="m${m.order}-meta"></a>`);
  L.push(`### Metadata`, "");
  L.push(`| Field | Value |`, `| --- | --- |`);
  L.push(`| Module number | ${m.order} |`);
  L.push(`| Slug | \`${m.slug}\` |`);
  L.push(`| Title | ${m.title} |`);
  L.push(`| Pass mark | ${m.passMark}% |`);
  L.push(`| Exam size (questions per sitting) | ${m.examSize} |`);
  L.push(`| Exam cooldown | ${m.examCooldownHours} hours after a failed attempt |`);
  L.push(`| Content version | v${m.contentVersion} |`);
  L.push(`| Published | ${m.isPublished ? "Yes" : "No"} |`);
  L.push(`| Exercise questions | ${m.exercises.length} |`);
  L.push(`| Exam questions | ${m.exam.length} |`);
  L.push(`| Last edited | ${m.lessons[0]?.updatedByEmail ? `${m.lessons[0].updatedByEmail}` : "Original seed (not edited)"} |`);
  L.push(`| Badge | No per-module badge. Contributes to the Partner Academy certificate, awarded when all published modules are passed. |`);
  L.push(`| Rank | Not applicable to the Partner Academy. Ranks belong to the 12-week program (see appendix). |`);
  L.push(`| Related certificates | Partner Academy certificate (verifiable, annual). Teaches the program credentials in the appendix. |`);
  L.push(`| Dependencies | ${dependency(m.order)} |`);
  L.push("");
  L.push(`**Summary.** ${m.summary}`, "");
  if (withAnchor) L.push(`<a id="m${m.order}-obj"></a>`);
  L.push(`### Learning objectives`, "", objectivesOf(html), "");
  if (withAnchor) L.push(`<a id="m${m.order}-lesson"></a>`);
  L.push(`### Full lesson body (rich content)`, "");
  L.push(`_This is the complete production lesson, converted from the stored HTML to Markdown. It contains every callout, table, checklist, talking point, example, objection and answer, scenario, form-preview description, and the exam-alignment section, in place._`, "");
  L.push(html ? htmlToMd(html) : "_No rich content stored._", "");
  if (withAnchor) L.push(`<a id="m${m.order}-plain"></a>`);
  L.push(`### Lesson body (plain prose / audio text)`, "");
  for (const para of (m.lessons[0]?.body ?? "").split("\n\n")) L.push(para.trim() + "\n");
  L.push("");
  if (withAnchor) L.push(`<a id="m${m.order}-ex"></a>`);
  L.push(`### Exercises (${m.exercises.length})`, "");
  m.exercises.forEach((q: any, i: number) => { L.push(renderQuestion("Exercise", i + 1, q), ""); });
  if (withAnchor) L.push(`<a id="m${m.order}-exam"></a>`);
  L.push(`### Final exam pool (${m.exam.length})`, "");
  m.exam.forEach((q: any, i: number) => { L.push(renderQuestion("Exam", i + 1, q), ""); });
  return L.join("\n");
}

// ---- Appendix ----
const GLOSSARY: Array<[string, string]> = [
  ["Pro", PRO_DEFINITION.proVsTenxpro.pro],
  ["TenXPro", PRO_DEFINITION.proVsTenxpro.tenxpro],
  ["TenX (the multiplier)", PRO_DEFINITION.multiplier.join(" ")],
  ["Detection, not persuasion", PRO_DEFINITION.partnerNote],
  ["The one-sentence screen", PRO_DEFINITION.screen.question + " " + PRO_DEFINITION.screen.verdict],
  ["Frame (phase)", "Weeks 1 to 4. Where does AI belong in the work? Produces the problem definition and an AI suitability assessment."],
  ["Design (phase)", "Weeks 5 to 8. How is a responsible solution built? Produces a prototype with guardrails and a workflow allocation."],
  ["Prove (phase)", "Weeks 9 to 10. Can the value be shown with evidence? Produces an evaluation rubric, a test set, and a value case."],
  ["Foresee (phase)", "Weeks 11 to 12. How is the solution kept relevant as AI, work, and risk change? Produces a foresight plan and the final dossier."],
  ["Living AI Solution Dossier", "The reviewed body of work assembled across the twelve weeks: connected assets from framing to a 90 day roadmap. It is the basis of certification."],
  ["Capstone review", "The final review of the dossier against published criteria, producing certified, conditionally certified, or completed without certification."],
  ["Partner Academy", "The fourteen module training that certifies a partner to represent the program honestly."],
  ["Partner Academy certificate", "The partner's own credential, issued when every published module is passed; carries a serial and year, is verifiable, and is renewed annually."],
  ["Content version", "Per module integer that increments when a superadmin edits a lesson. Passed partners keep their certificate for the year and are notified; not-yet-passed partners take the latest version."],
  ["Pass mark / exam size / cooldown", "The percent required to pass (80%), the number of questions per sitting, and the wait after a failed attempt."],
  ["Activation Gate", "The onboarding checklist a partner completes before any outreach using the TenXPros name; confirmed by the company on the Partner Panel."],
  ["Deal registration", "Registering a prospect in the Partner Panel before pursuing it, which establishes the commission claim."],
  ["B2C Charter / B2B Engagement", "The individual professional motion, and the organizational motion (counted by seats)."],
  ["Partner Panel", "The partner's console for registering opportunities and tracking accounts and commissions."],
  ["Commission by function", "Commission paid for the function performed (introduction, qualified origination, strong origination, closing, delivery), by basis points, from two-layer config."],
];

function appendixMd(withAnchor: boolean): string {
  const A: string[] = [];
  if (withAnchor) A.push(`<a id="appendix"></a>`);
  A.push(`# Appendix: global reference`, "");

  if (withAnchor) A.push(`<a id="pro-vs-tenxpro"></a>`);
  A.push(`## Pro vs TenXPro (canonical definition)`, "");
  A.push(`**${PRO_DEFINITION.headline}**`, "");
  A.push(`**A Pro.** ${PRO_DEFINITION.proVsTenxpro.pro}`, "");
  A.push(`**A TenXPro.** ${PRO_DEFINITION.proVsTenxpro.tenxpro}`, "");
  A.push(`**The multiplier.**`, "");
  for (const p of PRO_DEFINITION.multiplier) A.push(p, "");
  A.push(`**Who this is for.**`, "");
  for (const a of PRO_DEFINITION.archetypes) A.push(`- **${a.title}.** ${a.body}`);
  A.push("");
  A.push(`**The screen.** ${PRO_DEFINITION.screen.question} ${PRO_DEFINITION.screen.verdict}`, "");
  A.push(`**For partners.** ${PRO_DEFINITION.partnerNote}`, "");

  if (withAnchor) A.push(`<a id="partner-rules"></a>`);
  A.push(`## Partner rules referenced by the Academy`, "");
  const rules = data.modules.find((m: any) => m.slug === "rules");
  A.push(`Module 3 ("The Rules") is the canonical source. Its scope, verbatim from the module summary:`, "");
  A.push(`> ${rules ? rules.summary : "See Module 3."}`, "");
  A.push(`The full rules text, with examples and exam, is in [Module 3](#m3). Key principles the Academy enforces throughout:`, "");
  A.push(`- Detection, not persuasion: ${PRO_DEFINITION.partnerNote}`);
  A.push(`- Never promise a job, income, certification, or any outcome a partner cannot control.`);
  A.push(`- The Partner Panel is the single source of truth for registrations and commissions.`);
  A.push(`- Commission is earned by function, within caps, and is subject to clawback and annual validity.`);
  A.push("");

  if (withAnchor) A.push(`<a id="journey"></a>`);
  A.push(`## Journey explanation (the 12-week program the Academy teaches)`, "");
  A.push(`The partner-facing walkthrough is [Module 5](#m5). The canonical program structure (eleven core modules plus the final dossier and capstone review, grouped into four phases):`, "");
  A.push(`| Week | Phase | Module | Core question | Milestone badge |`, `| --- | --- | --- | --- | --- |`);
  for (const pm of programModules) A.push(`| ${pm.number} | ${pm.phase} | ${pm.title} | ${pm.coreQuestion} | ${pm.badgeName} |`);
  A.push(`| 12 | FORESEE | Final Dossier & Capstone Review | Is the work certifiable? | Capstone Review |`);
  A.push("");

  if (withAnchor) A.push(`<a id="badges-ranks"></a>`);
  A.push(`## Badges, ranks, and certificates`, "");
  const cat = (c: string) => badgeCatalog.filter((b: any) => b.category === c).sort((a: any, b: any) => a.order - b.order);
  A.push(`### Module milestone badges`, "", `| Order | Badge | Awarded for |`, `| --- | --- | --- |`);
  for (const b of cat("MODULE")) A.push(`| ${b.order} | ${b.name} | ${b.description} |`);
  A.push("", `### Ranks`, "", `| Rank | Meaning |`, `| --- | --- |`);
  for (const b of cat("RANK")) A.push(`| ${b.name} | ${b.description} |`);
  A.push("", `### Capstone and special`, "");
  for (const b of [...cat("CAPSTONE"), ...cat("SPECIAL")]) A.push(`- **${b.name}.** ${b.description}`);
  A.push("", `### Partner Academy completion certificate`, "", `Issued to a partner when every published Academy module is passed. Carries a unique serial and the calendar year, is verifiable on a public page, and is renewed annually.`, "");

  if (withAnchor) A.push(`<a id="glossary"></a>`);
  A.push(`## Glossary and canonical terminology`, "");
  for (const [t, d] of GLOSSARY) A.push(`**${t}.** ${d}`, "");

  if (withAnchor) A.push(`<a id="snippets"></a>`);
  A.push(`## Reusable snippets (say / avoid / talking points, extracted per module)`, "");
  A.push(`_These are pulled verbatim from each module's callouts and talking-point lists, for reuse and review. They also appear in place in each module's lesson body._`, "");
  for (const m of data.modules) {
    const snips = snippetsOf(m.lessons[0]?.bodyHtml ?? "");
    if (!snips.length) continue;
    A.push(`### Module ${m.order}: ${m.title}`, "");
    for (const s of snips) A.push(`- ${s}`);
    A.push("");
  }
  return A.join("\n");
}

// ---- Table of contents ----
function tocMd(): string {
  const T: string[] = [];
  T.push(`## Table of contents`, "");
  T.push(`- [How this export was produced](#how-this-export-was-produced)`);
  T.push(`- [Master index (all modules)](#master-index)`);
  T.push(`- **Modules**`);
  for (const m of data.modules) {
    T.push(`  - [Module ${m.order}: ${m.title}](#m${m.order})`);
    T.push(`    - [Metadata](#m${m.order}-meta) | [Learning objectives](#m${m.order}-obj) | [Lesson body](#m${m.order}-lesson) | [Plain prose](#m${m.order}-plain) | [Exercises](#m${m.order}-ex) | [Exam](#m${m.order}-exam)`);
  }
  T.push(`- **[Appendix: global reference](#appendix)**`);
  T.push(`  - [Pro vs TenXPro](#pro-vs-tenxpro)`);
  T.push(`  - [Partner rules referenced by the Academy](#partner-rules)`);
  T.push(`  - [Journey explanation](#journey)`);
  T.push(`  - [Badges, ranks, and certificates](#badges-ranks)`);
  T.push(`  - [Glossary and canonical terminology](#glossary)`);
  T.push(`  - [Reusable snippets](#snippets)`);
  return T.join("\n");
}

// ---- Assemble ----
const totalEx = data.modules.reduce((n: number, m: any) => n + m.exercises.length, 0);
const totalExam = data.modules.reduce((n: number, m: any) => n + m.exam.length, 0);

const header = [
  `# TenXPros Partner Academy: Complete Production Export`,
  "",
  `<a id="how-this-export-was-produced"></a>`,
  `## How this export was produced`,
  "",
  `This is the entire Partner Academy exactly as stored in the production database, exported field by field. The lesson bodies are the exact stored HTML, converted to readable Markdown with no content removed. Every module, every metadata field, every exercise and exam question with its options, correct answer, and explanation, plus the global appendix (Pro vs TenXPro, partner rules, the journey, badges and ranks, glossary, and reusable snippets) are included. Nothing is summarized or omitted.`,
  "",
  `- Source: **production database** (\`AcademyModule\`, \`AcademyLesson\`, \`AcademyQuestion\`).`,
  `- Modules: **${data.modules.length}**`,
  `- Exercise questions: **${totalEx}**`,
  `- Exam questions: **${totalExam}**`,
  `- Total questions: **${totalEx + totalExam}**`,
  "",
].join("\n");

const masterIndex = (() => {
  const I: string[] = [`<a id="master-index"></a>`, `## Master index`, "", `| # | Title | Slug | Pass mark | Exam size | Exercises | Exam | Version | Published |`, `| --- | --- | --- | --- | --- | --- | --- | --- | --- |`];
  for (const m of data.modules) I.push(`| ${m.order} | ${m.title} | \`${m.slug}\` | ${m.passMark}% | ${m.examSize} | ${m.exercises.length} | ${m.exam.length} | v${m.contentVersion} | ${m.isPublished ? "Yes" : "No"} |`);
  return I.join("\n") + "\n";
})();

// Combined single document.
const combined = [header, tocMd(), "", masterIndex, "", `# Modules`, "", ...data.modules.map((m: any) => moduleMd(m, true) + "\n\n---\n"), appendixMd(true), ""].join("\n");

// Split files.
fs.mkdirSync(outDir, { recursive: true });
const splitDir = path.join(outDir, "partner-academy-full-export");
fs.mkdirSync(splitDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "partner-academy-full-export.md"), combined);
fs.writeFileSync(path.join(splitDir, "00-index.md"), header + "\n" + masterIndex + "\n" + tocMd() + "\n");
for (const m of data.modules) {
  const num = String(m.order).padStart(2, "0");
  fs.writeFileSync(path.join(splitDir, `${num}-${m.slug}.md`), `# Module ${m.order}: ${m.title}\n\n` + moduleMd(m, false));
}
fs.writeFileSync(path.join(splitDir, "99-appendix.md"), appendixMd(false));

const bytes = Buffer.byteLength(combined, "utf-8");
process.stderr.write(`combined ${combined.split("\n").length} lines, ${(bytes / 1024).toFixed(0)} KB; split into ${data.modules.length + 2} files in ${splitDir}\n`);
