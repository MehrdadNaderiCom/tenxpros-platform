/**
 * Seeds the Partner Toolkit repository: the eight managed categories, the
 * existing starter posts reorganized under them, two small on-brand posts built
 * only from content already verified in the academy, and clearly-marked draft
 * placeholders for the categories whose real content is the owner's to write.
 *
 *  - "Outreach Templates": the ready-to-use outreach and objection templates,
 *    extracted verbatim from Module 14 so the wording stays identical and
 *    dash-clean (the module content already passes the content lint).
 *  - "Industry Packs": short, role-specific outreach templates.
 *  - Two real posts assembled from verified academy definitions and guardrails.
 *  - Placeholders are drafts (isPublished false), so partners never see them
 *    while the owner fills them in from the website.
 *
 * Idempotent and non-destructive: categories are upserted by slug without
 * overwriting later edits; a post is created only if its slug is absent, and an
 * existing post is only relinked to its category when it has none, so re-running
 * never clobbers a superadmin's edits. Run with:
 *   pnpm tsx prisma/seed/toolkit/seed-toolkit.ts
 */
import { PrismaClient } from "@prisma/client";
import { m14 } from "../academy/m14-customize";

const prisma = new PrismaClient();

/** Extract the "ready to use templates" block from Module 14, minus its heading. */
function genericTemplatesHtml(): string {
  const startMarker = "<h2>Partner Toolkit: ready to use templates</h2>";
  const endMarker = "<h2>How this maps to your exam</h2>";
  const body = m14.bodyHtml ?? "";
  const start = body.indexOf(startMarker);
  const end = body.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("Could not locate the Module 14 toolkit block. Its structure may have changed.");
  }
  return body.slice(start + startMarker.length, end).trim();
}

// The eight managed categories. Ids match the migration so both converge.
const CATEGORIES: Array<{ id: string; slug: string; title: string; description: string; order: number }> = [
  { id: "tkcat_start_here", slug: "start-here", title: "Start Here", description: "What the toolkit is, how to use it, and the fastest path to your first good conversation.", order: 0 },
  { id: "tkcat_positioning_brand", slug: "positioning-and-brand", title: "Positioning and Brand", description: "How to describe TenXPros truthfully and on brand, including what to say and what to avoid.", order: 1 },
  { id: "tkcat_qualification_discovery", slug: "qualification-and-discovery", title: "Qualification and Discovery", description: "How to tell a real Pro from a beginner, and the discovery questions that surface a real problem.", order: 2 },
  { id: "tkcat_outreach_templates", slug: "outreach-templates", title: "Outreach Templates", description: "Approved outreach and objection templates you personalize, never scripts to send blindly.", order: 3 },
  { id: "tkcat_institutional_assets", slug: "institutional-assets", title: "Institutional Assets", description: "Materials for approaching an institution, where you sell a capability to a team rather than one person.", order: 4 },
  { id: "tkcat_industry_packs", slug: "industry-packs", title: "Industry Packs", description: "Templates tailored to a sector or role, from universities to hospitals to owners and CEOs.", order: 5 },
  { id: "tkcat_proof_dossier", slug: "proof-and-dossier", title: "Proof and Dossier", description: "How to use the reviewed dossier and the public sample as honest proof of what the program produces.", order: 6 },
  { id: "tkcat_compliance_conduct", slug: "compliance-and-conduct", title: "Compliance and Conduct", description: "The guardrails: no price or discount outside approved materials, no promised outcomes, honest conduct.", order: 7 },
];

const titleBySlug = new Map(CATEGORIES.map((c) => [c.slug, c.title]));

// Two real posts, assembled only from verified academy content.
const startHereHtml = `<div class="callout callout-info"><p>This is the short, honest description of what you are opening a door to. Use it to keep your own language accurate. Nothing here contains a price or a promise of results, by design.</p></div>
<h3>Pro and TenXPro: the multiplier</h3>
<p>TenX means a multiplier. The program multiplies an AI method onto something the person already has. Ten times zero is still zero, so the input has to be real. A beginner with no field is a zero: there is nothing to multiply. That is the structural reason it does not work for a beginner, and it is exactly what the promise says. You bring the expertise. We bring the method.</p>
<h3>Detection, not persuasion</h3>
<p>Your job is detection, not persuasion. A Pro is a real expert in a field who already uses AI loosely. A TenXPro is that same expert leading AI adoption with method, evidence, and governance. You are looking for the first so the program can build the second. If you have to convince someone they are a Pro, they almost always are not. That is why qualifying on genuine readiness is honest work and pushing volume is not.</p>
<h3>What the person walks away with</h3>
<p>It is built around one real problem and a reviewed dossier, so the person leaves with evidence they can defend, not a completion certificate. It is a private professional certification: its credibility comes from the reviewed dossier, the public criteria, and the verifiable credential, not from a university stamp. Certification is not guaranteed. It depends on whether the dossier meets the review standard, and the three outcomes are Certified, Strong Draft, and Completed.</p>`;

const sayThisNotThisHtml = `<div class="callout callout-info"><p>Keep your language accurate and on brand. These are approved lines you can adapt, not scripts to send blindly. None of them contain a price or a promise of results, by design.</p></div>
<div class="callout callout-success"><p><strong>Say this:</strong> "In your work, the highest value, lowest risk place for AI looks like drafting and synthesis, and the hard boundary is the final judgment that has to stay with a qualified human. Frame would scope exactly that, and Prove would test it with evidence you could defend."</p></div>
<div class="callout callout-warning"><p><strong>Do not say this:</strong> "For your industry we can guarantee this cuts your review time in half." You never promise a result, a number, or an outcome, no matter how tailored the story sounds, and you never invent a program fact to fit a case.</p></div>
<h3>Honest answers to common questions</h3>
<blockquote><p>Is this just another AI course? No. Most courses teach tools and prompts. This is built around one real problem and a reviewed dossier, so you leave with evidence you can defend, not a completion certificate.</p></blockquote>
<blockquote><p>Is it accredited? No. It is a private professional certification. Its credibility comes from the reviewed dossier, the public criteria, and the verifiable credential, not from a university stamp.</p></blockquote>
<blockquote><p>Do I need to code? No. The core requirement is professional judgment in your field, not coding.</p></blockquote>
<blockquote><p>Will I definitely get certified? No. Certification depends on whether your dossier meets the review standard. The three outcomes are Certified, Strong Draft, and Completed.</p></blockquote>`;

// Industry Packs (unchanged wording, reorganized under the managed category).
const universityHtml = `<div class="callout callout-info"><p>Use these with universities, schools, and other education bodies. Keep the placeholders in square brackets and personalize each one. Nothing here contains a price or a promise of results, by design.</p></div>
<h3>Reaching a department head or dean</h3><blockquote><p>Hi [first name], I work with experienced educators and academic leaders who want to lead AI adoption in teaching and administration, not just react to it. Given your work on [specific programme or initiative], I thought a short conversation might be worth your time. The approach is built around one real problem in your own context and a reviewed piece of work, so people leave with something defensible. Would a brief call in the next couple of weeks be welcome?</p></blockquote>
<h3>Reaching a program director about staff development</h3><blockquote><p>Hi [first name], many faculties are being asked to show credible, responsible use of AI. I help professionals build reviewed, verifiable work in their own field rather than sit through generic tool training. If developing that capability across [department] is on your list, I would be glad to share how it works. No obligation either way.</p></blockquote>`;

const hospitalHtml = `<div class="callout callout-info"><p>Use these with hospitals, clinics, and health bodies. Always respect confidential and regulated data: ask people to use redacted or fictionalized examples unless they have the rights and safeguards for real data.</p></div>
<h3>Reaching a clinical or operations lead</h3><blockquote><p>Hi [first name], clinical and operational teams are under real pressure to use AI safely and to show that they are doing it well. I work with experienced professionals to build reviewed, defensible work on one real problem in their own setting, with data handled responsibly. If that is relevant to [department or unit], I would value a short conversation.</p></blockquote>
<h3>Reaching a medical education or nursing lead</h3><blockquote><p>Hi [first name], I help experienced clinicians and educators move from using AI tools to leading their adoption in a way that stands up to scrutiny. The work centers on one real, appropriately redacted problem and is independently reviewed. If building that capability with your team is worth exploring, I am happy to explain the details.</p></blockquote>`;

const individualExpertHtml = `<div class="callout callout-info"><p>Use these with an individual senior professional, for example a doctor, lawyer, architect, or independent consultant. The tone is peer to peer, focused on their own practice.</p></div>
<h3>Warm approach to an individual expert</h3><blockquote><p>Hi [first name], I have been close to how experienced professionals in [their field] are moving from using AI to actually leading it in their own practice. Given your depth in [specialty], you came to mind. The work is built around one real problem you choose, and the result is a reviewed piece you can defend, not a completion certificate. If a short conversation is useful, I am glad to set one up.</p></blockquote>
<h3>Follow up that adds value</h3><blockquote><p>Hi [first name], following up briefly. As an example of how someone in [their field] approaches this: [one or two sentences framed as an example, not a promise]. If it is worth a short call, I am happy to arrange it. If the timing is not right, just let me know and I will leave it there.</p></blockquote>`;

const ownerCeoHtml = `<div class="callout callout-info"><p>Use these with an owner, founder, or CEO, for example the head of a restaurant group or a growing business. The focus is the outcome for their organization, still without promising results.</p></div>
<h3>Reaching an owner or CEO</h3><blockquote><p>Hi [first name], leaders of businesses like [company] are being told to adopt AI, but most training stops at tools. I work with senior people to build reviewed, defensible work on one real problem in their own operation, so the capability is genuine and verifiable. If leading that in [company] is on your mind, a short conversation might be worth it.</p></blockquote>
<h3>Reaching a CEO through a mutual contact</h3><blockquote><p>Hi [first name], [mutual contact] suggested we connect. I help experienced leaders move from using AI to leading its adoption in their organization, with independently reviewed work rather than a certificate of attendance. If that is relevant to what you are focused on at [company], would a brief call in the next week or two be welcome?</p></blockquote>`;

/** A clearly-marked placeholder body: a warning banner plus a short guide. */
function placeholder(guide: string): string {
  return `<div class="callout callout-warning"><p><strong>Placeholder, not finished content.</strong> ${guide}</p></div>`;
}

type StarterPost = { slug: string; title: string; categorySlug: string; order: number; isPublished: boolean; bodyHtml: string };

async function main() {
  // Ensure the eight categories exist. Upsert by the stable id (not the slug, which
  // the owner may rename), and never overwrite later edits.
  for (const c of CATEGORIES) {
    await prisma.toolkitCategory.upsert({
      where: { id: c.id },
      update: {},
      create: { id: c.id, slug: c.slug, title: c.title, description: c.description, order: c.order, isPublished: true },
    });
  }
  const cats = await prisma.toolkitCategory.findMany({ select: { id: true, slug: true } });
  const idBySlug = new Map(cats.map((c) => [c.slug, c.id]));

  const posts: StarterPost[] = [
    // Real posts, from verified content.
    { slug: "what-tenxpros-is-for-partners", title: "What TenXPros is, for partners", categorySlug: "start-here", order: 0, isPublished: true, bodyHtml: startHereHtml },
    { slug: "say-this-not-this", title: "Say this, not this", categorySlug: "positioning-and-brand", order: 0, isPublished: true, bodyHtml: sayThisNotThisHtml },

    // Existing five, reorganized under managed categories.
    { slug: "outreach-and-objection-templates", title: "Outreach and objection templates", categorySlug: "outreach-templates", order: 0, isPublished: true, bodyHtml: genericTemplatesHtml() },
    { slug: "templates-universities-and-schools", title: "Templates for universities and schools", categorySlug: "industry-packs", order: 10, isPublished: true, bodyHtml: universityHtml },
    { slug: "templates-hospitals-and-clinics", title: "Templates for hospitals and clinics", categorySlug: "industry-packs", order: 11, isPublished: true, bodyHtml: hospitalHtml },
    { slug: "templates-individual-expert", title: "Templates for an individual expert (doctor, lawyer, consultant)", categorySlug: "industry-packs", order: 12, isPublished: true, bodyHtml: individualExpertHtml },
    { slug: "templates-owner-or-ceo", title: "Templates for an owner or CEO", categorySlug: "industry-packs", order: 13, isPublished: true, bodyHtml: ownerCeoHtml },

    // Placeholders (drafts): visible to the owner in admin, hidden from partners.
    { slug: "placeholder-qualification-and-discovery", title: "[Placeholder] Qualification and discovery pack", categorySlug: "qualification-and-discovery", order: 0, isPublished: false, bodyHtml: placeholder("Put the discovery questions and the Pro qualification checklist here, drawn from Module 2 and Module 14, as a short checklist a partner can run in their head.") },
    { slug: "placeholder-institutional-assets", title: "[Placeholder] Institution one page and pilot framing", categorySlug: "institutional-assets", order: 0, isPublished: false, bodyHtml: placeholder("Put the institution facing one page summary and the pilot framing here, for selling a capability to a team. No price and no promised outcomes.") },
    { slug: "placeholder-proof-and-dossier", title: "[Placeholder] Using the sample dossier as proof", categorySlug: "proof-and-dossier", order: 0, isPublished: false, bodyHtml: placeholder("Point to the public sample dossier and explain how to use it as honest proof of what the program produces, never as a guarantee.") },
    { slug: "placeholder-compliance-and-conduct", title: "[Placeholder] Compliance and conduct essentials", categorySlug: "compliance-and-conduct", order: 0, isPublished: false, bodyHtml: placeholder("Put the guardrails here: no price or discount outside approved materials, no promised results, and redacted or fictionalized examples for regulated data. Draw from the Module 14 guardrails.") },
    { slug: "placeholder-industry-packs-more-sectors", title: "[Placeholder] More sector packs", categorySlug: "industry-packs", order: 20, isPublished: false, bodyHtml: placeholder("Add sector packs beyond the current four as you write them, one post per sector, each with a short, honest outreach template and nothing that promises a result.") },
  ];

  let created = 0;
  let relinked = 0;
  for (const p of posts) {
    const categoryId = idBySlug.get(p.categorySlug) ?? null;
    const categoryLabel = titleBySlug.get(p.categorySlug) ?? "General";
    const existing = await prisma.toolkitPost.findUnique({ where: { slug: p.slug }, select: { id: true, categoryId: true } });
    if (existing) {
      if (!existing.categoryId && categoryId) {
        await prisma.toolkitPost.update({ where: { id: existing.id }, data: { categoryId, category: categoryLabel } });
        relinked += 1;
        console.log(`relinked: ${p.slug}`);
      } else {
        console.log(`skip (exists): ${p.slug}`);
      }
      continue;
    }
    await prisma.toolkitPost.create({
      data: {
        slug: p.slug,
        title: p.title,
        category: categoryLabel,
        categoryId,
        order: p.order,
        bodyHtml: p.bodyHtml,
        isPublished: p.isPublished,
        authorEmail: "mail@mehrdadnaderi.com",
      },
    });
    created += 1;
    console.log(`created: ${p.slug}`);
  }
  console.log(`Toolkit seed done. Created ${created}, relinked ${relinked}, total defined ${posts.length}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
