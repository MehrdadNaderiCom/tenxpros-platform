/**
 * Build the COMPLETE partner section as one Markdown document, straight from the
 * code (the Academy seed modules, the partner terms builder, and the public
 * partners page content), NOT from the database. This is the source for the
 * single partner section PDF: a clickable table of contents, the public Partner
 * Program page, all seventeen Academy modules in full (rich lesson with every
 * screenshot embedded, plain prose, exercises and exams), the full Partner
 * Program Terms, and an appendix (badges, ranks, glossary). Nothing is omitted.
 *
 * Screenshots are emitted as standalone <img> lines so the PDF renderer inlines
 * them; the renderer strips loading="lazy".
 *
 *   pnpm exec tsx scripts/generate-partner-section.ts > <out>.md
 */
import { ACADEMY_MODULES } from "../prisma/seed/academy/modules";
import { sanitizeLessonHtml } from "../src/lib/academy/lesson-html";
import { badgeCatalog } from "../src/lib/program-data";
import { PRO_DEFINITION } from "../src/lib/marketing/pro-definition";
import { PROGRAM_CONFIG_DEFAULTS as CFG } from "../src/lib/partner/config";
import { formatBp } from "../src/lib/partner/constants";
import { PARTNER_TERMS_SECTIONS, PARTNER_TERMS_LEAD } from "../src/lib/partner/terms";
import { SURVIVAL_CLAUSES, ANNUAL_VALIDITY, currentTermsYear } from "../src/lib/terms/annual";

const LETTER = ["A", "B", "C", "D"];
const pct = (bp: number) => formatBp(bp);

// ---- HTML -> Markdown ------------------------------------------------------
function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
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
    .replace(/<\s*h2\b[^>]*>([\s\S]*?)<\s*\/\s*h2\s*>/gi, (_m, t) => `\n\n#### ${inline(t)}\n`)
    .replace(/<\s*h3\b[^>]*>([\s\S]*?)<\s*\/\s*h3\s*>/gi, (_m, t) => `\n\n##### ${inline(t)}\n`)
    .replace(/<\s*h4\b[^>]*>([\s\S]*?)<\s*\/\s*h4\s*>/gi, (_m, t) => `\n\n###### ${inline(t)}\n`)
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
  const stash = (md: string) => { blocks.push(md); return `@@STASH${blocks.length - 1}@@`; };
  // Tables first.
  s = s.replace(/<\s*table\b[\s\S]*?<\s*\/\s*table\s*>/gi, (m) => "\n\n" + stash(tableToMd(m)) + "\n\n");
  // Callouts -> labelled blockquote.
  s = s.replace(/<div\s+class="callout([^"]*)"\s*>([\s\S]*?)<\s*\/div\s*>/gi, (_m, cls: string, inner: string) => {
    const tone = /callout-(\w+)/.exec(cls)?.[1] ?? "info";
    const label = ({ info: "Note", tip: "Tip", warning: "Watch out", success: "Say this" } as Record<string, string>)[tone] ?? "Note";
    const text = innerBlocks(inner).trim().split("\n").map((l) => (l.trim() ? `> ${l}` : ">")).join("\n").replace(/^> /, `> **${label}:** `);
    return "\n\n" + stash(text) + "\n\n";
  });
  // Form previews -> bold label, STANDALONE image, then caption. The standalone
  // <img> line is what lets the PDF renderer inline the screenshot.
  s = s.replace(/<div\s+class="form-preview"\s*>([\s\S]*?)<\s*\/div\s*>/gi, (_m, inner: string) => {
    const lbl = /<div\s+class="form-preview-label"\s*>([\s\S]*?)<\s*\/div\s*>/i.exec(inner)?.[1] ?? "Screen";
    const rest = inner.replace(/<div\s+class="form-preview-label"\s*>[\s\S]*?<\s*\/div\s*>/i, "");
    const imgM = /<img\b[^>]*>/i.exec(rest);
    const img = imgM ? imgM[0].replace(/\s*\/?>\s*$/, " />") : "";
    const caption = innerBlocks(rest.replace(/<img\b[^>]*>/i, "")).trim();
    const parts = [`**${inline(lbl)}**`];
    if (img) parts.push(img);
    if (caption) parts.push(caption);
    return "\n\n" + stash(parts.join("\n\n")) + "\n\n";
  });
  s = innerBlocks(s);
  s = s.replace(/@@STASH(\d+)@@/g, (_m, i) => blocks[Number(i)]);
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

function renderQuestion(kind: string, n: number, q: any): string {
  const opts = (q.options as string[]).map((o, i) => `- ${LETTER[i]}. ${o}${i === q.correct ? "  **(correct)**" : ""}`).join("\n");
  return [`**${kind} ${n}.** ${q.stem}`, "", opts, "", `**Answer:** ${LETTER[q.correct]}. ${(q.options as string[])[q.correct]}`, "", `**Explanation:** ${q.explanation}`].join("\n");
}

// ---------------------------------------------------------------------------
const out: string[] = [];
const year = currentTermsYear();
const examBearing = ACADEMY_MODULES.filter((m) => !m.isInformational);
const informational = ACADEMY_MODULES.filter((m) => m.isInformational);
const totalExercises = ACADEMY_MODULES.reduce((n, m) => n + m.exercises.length, 0);
const totalExam = ACADEMY_MODULES.reduce((n, m) => n + m.exam.length, 0);

out.push(`# TenXPros Partner Program: Complete Reference`);
out.push("");
out.push(`This document gathers the entire partner facing experience in one place, generated directly from the code (the Academy seed modules, the partner terms builder, and the public Partner Program page). It contains the public program page, all ${ACADEMY_MODULES.length} Academy modules in full with every screenshot, the full Partner Program Terms, and an appendix of badges, ranks, and a glossary. Every rate, cap, and threshold is rendered from the configuration source of truth, so no number is hand typed. Nothing is summarized or omitted.`);
out.push("");
out.push(`- Academy modules: **${ACADEMY_MODULES.length}** (${examBearing.length} exam bearing, ${informational.length} informational)`);
out.push(`- Exercise questions: **${totalExercises}**`);
out.push(`- Exam questions: **${totalExam}**`);
out.push(`- Terms sections: **${PARTNER_TERMS_SECTIONS.length}**`);
out.push("");

// ---- Table of contents -----------------------------------------------------
out.push(`## Table of contents`);
out.push("");
out.push(`- [Part 1: The public Partner Program page](#part-public)`);
out.push(`- [Part 2: The Partner Academy (all ${ACADEMY_MODULES.length} modules)](#part-academy)`);
for (const m of ACADEMY_MODULES) {
  out.push(`  - [Module ${m.order}: ${m.title}](#m${m.order})${m.isInformational ? " (informational)" : ""}`);
}
out.push(`- [Part 3: The Partner Program Terms](#part-terms)`);
for (const sec of PARTNER_TERMS_SECTIONS) {
  const anchor = "t-" + sec.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  out.push(`  - [${sec.title}](#${anchor})`);
}
out.push(`- [Appendix: badges, ranks, and glossary](#appendix)`);
out.push("");

// ---- Part 1: public partners page -----------------------------------------
// Reconstructed from the public page's own content, with every number rendered
// from the same configuration source the live page uses.
const deliveryRate = pct(CFG.deliveryPercentBp);
const overrideShare = `${pct(CFG.overrideShareBp)} of the opener rate`;
const STAGES: Array<[string, string]> = [
  ["Pilot and activation", `Every partner starts on a ${CFG.pilotDays}-day pilot and completes a short Activation Gate. Once the company confirms you on the panel, you are ready to begin.`],
  ["Register and earn", "You register each opportunity before you pursue it. The moment it is confirmed on the panel it is protected for you, and you earn commission on the functions you perform once the customer has paid."],
  ["Grow and progress", "By real, recorded results you can be invited to Tier 2 and then Tier 3, unlocking more open accounts, longer protection on your work, and priority on company leads."],
  ["Lead a focus", "A proven Tier 3 partner can earn a focus on one industry or region, with a focus bonus and public recognition as its lead partner."],
];
const TIERS = [
  { eyebrow: "Tier 1", name: "Referral Partner", blurb: `Where every partner begins, on a ${CFG.pilotDays}-day pilot.`, points: ["Register opportunities and earn on every confirmed deal", `Hold up to ${CFG.maxOpenAccountsTier1} open registered accounts`, "Use the TenXPros Referral Partner credential"] },
  { eyebrow: "Tier 2", name: "Certified Partner", blurb: "Earned by real, collected results across sales and delivery.", points: [`Hold up to ${CFG.maxOpenAccountsTier2} open accounts, with longer protection`, "Priority on company leads, and a growth bonus", "Certified credential, a public listing, and a letter of recognition"] },
  { eyebrow: "Tier 3", name: "Territory Builder", blurb: "For a proven partner with a focus on one industry or region.", points: [`Hold up to ${CFG.maxOpenAccountsTier3} open accounts, with the longest protection`, "First priority on leads within your focus", "A focus bonus and public recognition as the lead partner"] },
];
const FUNCTIONS: Array<[string, string]> = [
  ["Basic Introduction", "Introduce and explain us to someone you genuinely know, then step away: zero meetings and no follow-up. A genuinely valuable introduction is rewarded even though you introduce and step aside."],
  ["Origination", "Go beyond an introduction: attend the meetings, take on the follow-up, and open a real account. The higher Strong rate is decided by seat count, not opinion."],
  ["Closing", "Drive the deal to a signed, started contract yourself. Our team gives at most one short online meeting; you carry the rest to signature and start."],
  ["Delivery and Coaching", "Delivery is normally the company's own. When the company engages a partner to help it scale, this pays a single set rate."],
  ["Renewal Override", "B2B only: open an account and keep supporting it, and a renewal within the window pays you a share of the rate you opened it at, on top of that renewal's own commission."],
];
const COMMISSION_ROWS: Array<[string, string, string]> = [
  ["Basic Introduction", pct(CFG.basicIntroductionBp), pct(CFG.basicIntroductionBp)],
  ["Qualified Origination", pct(CFG.qualifiedOriginationB2cBp), pct(CFG.qualifiedOriginationB2bBp)],
  ["Strong Origination", pct(CFG.strongOriginationB2cBp), pct(CFG.strongOriginationB2bBp)],
  ["Closing", pct(CFG.closingB2cBp), pct(CFG.closingB2bBp)],
  ["Delivery or Coaching", deliveryRate, deliveryRate],
  ["Renewal Override", overrideShare, overrideShare],
];

out.push(`<a id="part-public"></a>`);
out.push(`# Part 1: The public Partner Program page`);
out.push("");
out.push(`_This is the public recruitment page for the Partner Program, as it appears at tenxpros.com/partners._`);
out.push("");
out.push(`## Help build TenXPros, and earn for the work you do.`);
out.push("");
out.push(`Sell, deliver and grow TenXPros, and earn a clear, defined commission on every opportunity you bring to a close. Each one is registered, protected and tracked on the Partner Panel, so you always know where you stand and what you have earned. A clear three-tier path, transparent commission, and recognition you carry into your career.`);
out.push("");
out.push(`### The simple principle`);
out.push("");
out.push(`Your right to earn is the sum of real things: a registered opportunity, a role you actually performed, money received and cleared, a defined time window, and an account you actively manage. Everything runs on the TenXPros Partner Panel. Each registration, confirmation and payment is recorded there, so you always have a clear, shared record of what was agreed and what you have earned.`);
out.push("");
out.push(`### How the relationship works, stage by stage`);
out.push("");
STAGES.forEach(([title, body], i) => { out.push(`**Step ${i + 1}. ${title}.** ${body}`); out.push(""); });
out.push(`### The three-tier ladder`);
out.push("");
out.push(`Every tier earns commission on all functions at the same rates. What grows with each tier is protection, priority and recognition, and at the top, a focus on an industry or region.`);
out.push("");
for (const t of TIERS) {
  out.push(`**${t.eyebrow}: ${t.name}.** ${t.blurb}`);
  out.push("");
  for (const p of t.points) out.push(`- ${p}`);
  out.push("");
}
out.push(`### How you earn`);
out.push("");
out.push(`Commission is earned by function and calculated on net receipts actually received and cleared. You earn for the functions you perform on each closed deal.`);
out.push("");
for (const [title, body] of FUNCTIONS) out.push(`- **${title}.** ${body}`);
out.push("");
out.push(`| Function | B2C Charter | B2B Engagement |`);
out.push(`| --- | --- | --- |`);
for (const [fn, b2c, b2b] of COMMISSION_ROWS) out.push(`| ${fn} | ${b2c} | ${b2b} |`);
out.push(`| **Cap per deal** | **${pct(CFG.capB2cBp)}** | **${pct(CFG.capB2bBp)}** |`);
out.push("");
out.push(`Total partner compensation on any one deal is capped at ${pct(CFG.capB2cBp)} of Net Receipts on B2C and ${pct(CFG.capB2bBp)} on B2B, across every function and every partner on the deal. The one exception is a Tier 3 focus account, which can rise gradually to ${pct(CFG.tier3FocusHardCeilingBp)}. When functions stack above the cap, the lines scale down in proportion to fit it exactly.`);
out.push("");
out.push(`The higher Strong Origination rate is decided by seat count, on paid and collected seats: on B2C it applies from ${CFG.strongSeatThresholdB2c} seats (seats alone decide; an individual has no domain), and on B2B it needs both a genuinely new or dormant company domain and ${CFG.strongSeatThresholdB2b} seats or more. Below the threshold, a new-company B2B deal keeps its new-company standing but is paid the Qualified rate. The Renewal Override is B2B only, a share of the rate the account was opened at, credited to the partner who opened it while they keep supporting it. The full detail is in the Partner Program Terms (Part 3).`);
out.push("");
out.push(`### Recognition you keep`);
out.push("");
out.push(`At every tier you hold a real, professional credential. Certified partners can be listed by name on tenxpros.com and request a written letter of recognition confirming their role and verified results. These are yours to carry into the rest of your career.`);
out.push("");
out.push(`### Ready to begin?`);
out.push("");
out.push(`Apply to the ${CFG.pilotDays}-day pilot. We read every application personally, and you start as soon as you are confirmed on the panel. Apply at tenxpros.com/partners/apply.`);
out.push("");

// ---- Part 2: the Academy ---------------------------------------------------
out.push(`<a id="part-academy"></a>`);
out.push(`# Part 2: The Partner Academy`);
out.push("");
out.push(`All ${ACADEMY_MODULES.length} Academy modules in full: the rich lesson content with every screenshot in place, the plain prose version, and (for exam bearing modules) every exercise and exam question with its answer and explanation. Modules ${examBearing.length + 1} to ${ACADEMY_MODULES.length} are informational (lesson only, no exam).`);
out.push("");
for (const m of ACADEMY_MODULES) {
  out.push(`<a id="m${m.order}"></a>`);
  out.push(`## Module ${m.order}: ${m.title}`);
  out.push("");
  out.push(`- **Slug:** \`${m.slug}\``);
  out.push(`- **Type:** ${m.isInformational ? "Informational (lesson only)" : "Exam bearing"}`);
  if (!m.isInformational) {
    out.push(`- **Pass mark:** ${m.passMark}%`);
    out.push(`- **Exam size:** ${m.examSize} questions per sitting`);
    out.push(`- **Exercises:** ${m.exercises.length}`);
    out.push(`- **Exam pool:** ${m.exam.length}`);
  }
  out.push("");
  out.push(`**Summary.** ${m.summary}`);
  out.push("");
  out.push(`### Lesson`);
  out.push("");
  out.push(m.bodyHtml ? htmlToMd(sanitizeLessonHtml(m.bodyHtml)) : "_No rich content authored for this module._");
  out.push("");
  out.push(`### Lesson (plain prose and audio text)`);
  out.push("");
  for (const para of m.lesson.split("\n\n")) out.push(para.trim() + "\n");
  out.push("");
  if (m.isInformational) {
    out.push(`_This is an informational module: a lesson only, with no exercises or exam._`);
    out.push("");
  } else {
    out.push(`### Exercises (${m.exercises.length})`);
    out.push("");
    m.exercises.forEach((q, i) => { out.push(renderQuestion("Exercise", i + 1, q)); out.push(""); });
    out.push(`### Final exam pool (${m.exam.length})`);
    out.push("");
    m.exam.forEach((q, i) => { out.push(renderQuestion("Exam", i + 1, q)); out.push(""); });
  }
  out.push("---");
  out.push("");
}

// ---- Part 3: terms ---------------------------------------------------------
out.push(`<a id="part-terms"></a>`);
out.push(`# Part 3: The Partner Program Terms`);
out.push("");
out.push(PARTNER_TERMS_LEAD);
out.push("");
for (const sec of PARTNER_TERMS_SECTIONS) {
  const anchor = "t-" + sec.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  out.push(`<a id="${anchor}"></a>`);
  out.push(`### ${sec.title}`);
  out.push("");
  for (const b of sec.body ?? []) { out.push(b); out.push(""); }
  for (const b of sec.bullets ?? []) out.push(`- ${b}`);
  if (sec.bullets?.length) out.push("");
}
out.push(`### Annual validity of the terms (${year})`);
out.push("");
for (const p of ANNUAL_VALIDITY) { out.push(p); out.push(""); }
out.push(`### Clauses that survive year end and the end of a partnership`);
out.push("");
for (const c of SURVIVAL_CLAUSES) out.push(`- **${c.title}.** ${c.body}`);
out.push("");

// ---- Appendix --------------------------------------------------------------
const byCat = (c: string) => badgeCatalog.filter((b: any) => b.category === c).sort((a: any, b: any) => a.order - b.order);
out.push(`<a id="appendix"></a>`);
out.push(`# Appendix: badges, ranks, and glossary`);
out.push("");
out.push(`## Pro and TenXPro`);
out.push("");
out.push(`**A Pro.** ${PRO_DEFINITION.proVsTenxpro.pro}`);
out.push("");
out.push(`**A TenXPro.** ${PRO_DEFINITION.proVsTenxpro.tenxpro}`);
out.push("");
out.push(`**For partners.** ${PRO_DEFINITION.partnerNote}`);
out.push("");
out.push(`## Module milestone badges`);
out.push("");
out.push(`| Order | Badge | Awarded for |`);
out.push(`| --- | --- | --- |`);
for (const b of byCat("MODULE")) out.push(`| ${b.order} | ${b.name} | ${b.description} |`);
out.push("");
out.push(`## Ranks`);
out.push("");
out.push(`| Rank | Meaning |`);
out.push(`| --- | --- |`);
for (const b of byCat("RANK")) out.push(`| ${b.name} | ${b.description} |`);
out.push("");
const capstoneSpecial = [...byCat("CAPSTONE"), ...byCat("SPECIAL")];
if (capstoneSpecial.length) {
  out.push(`## Capstone and special`);
  out.push("");
  for (const b of capstoneSpecial) out.push(`- **${b.name}.** ${b.description}`);
  out.push("");
}
const GLOSSARY: Array<[string, string]> = [
  ["Pro", PRO_DEFINITION.proVsTenxpro.pro],
  ["TenXPro", PRO_DEFINITION.proVsTenxpro.tenxpro],
  ["Detection, not persuasion", PRO_DEFINITION.partnerNote],
  ["Living AI Solution Dossier", "The reviewed body of work a participant assembles across the twelve weeks: connected assets covering a focused professional challenge, from framing to a 90 day roadmap. It is the basis of the certification decision."],
  ["Capstone review", "The final review of the dossier against the published criteria, producing one of three honest outcomes (certified, conditionally certified, or completed without certification)."],
  ["Partner Academy", "The module based training that certifies a partner to represent the program honestly, with exam bearing modules plus a few informational ones."],
  ["Partner Academy certificate", "The partner's own credential, issued when every published module is passed. It carries a serial and a calendar year, is verifiable on a public page, and is renewed annually."],
  ["Activation Gate", "The onboarding checklist a partner completes before any outreach using the TenXPros name; the company confirms it on the Partner Panel."],
  ["Deal registration", "Registering a prospect or opportunity in the Partner Panel before pursuing it, which establishes the partner's claim to commission on that work."],
  ["B2C Charter", "The individual professional motion: a single Pro enrolls to earn the credential."],
  ["B2B Engagement", "The organizational motion: an organization sponsors a cohort of its professionals, counted by seats."],
  ["Net Receipts", "The money that actually reaches and clears to the company after the real costs of the sale, such as processor and gateway fees and any currency conversion cost. Commission is a percentage of Net Receipts, not of the sticker price and not of profit."],
  ["Clawback", "The rule that reverses commission when the underlying money is refunded, charged back, cancelled, or reversed."],
  ["Partner Panel", "The partner's operational console for registering opportunities, tracking accounts and commissions, and confirming the Activation Gate."],
];
out.push(`## Glossary`);
out.push("");
for (const [t, d] of GLOSSARY) { out.push(`**${t}.** ${d}`); out.push(""); }

process.stdout.write(out.join("\n"));
