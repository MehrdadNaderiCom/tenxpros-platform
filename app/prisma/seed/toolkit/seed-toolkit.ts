/**
 * Seeds the Partner Toolkit repository with a starter set of resources:
 *
 *  - "Generic assets": the ready-to-use outreach and objection templates,
 *    extracted verbatim from Module 14 so the wording stays identical and
 *    dash-clean (the module content already passes the content lint).
 *  - "Industry and role templates": short, role-specific outreach templates,
 *    because presenting to a university differs from a hospital, and pitching to
 *    an individual expert differs from an owner or CEO.
 *
 * Idempotent and non-destructive: a post is created only if its slug is absent,
 * so re-running never clobbers a superadmin's later edits. Run with:
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

type StarterPost = { slug: string; title: string; category: string; order: number; bodyHtml: string };

const INDUSTRY = "Industry and role templates";

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

async function main() {
  const posts: StarterPost[] = [
    {
      slug: "outreach-and-objection-templates",
      title: "Outreach and objection templates",
      category: "Generic assets",
      order: 0,
      bodyHtml: genericTemplatesHtml(),
    },
    { slug: "templates-universities-and-schools", title: "Templates for universities and schools", category: INDUSTRY, order: 10, bodyHtml: universityHtml },
    { slug: "templates-hospitals-and-clinics", title: "Templates for hospitals and clinics", category: INDUSTRY, order: 11, bodyHtml: hospitalHtml },
    { slug: "templates-individual-expert", title: "Templates for an individual expert (doctor, lawyer, consultant)", category: INDUSTRY, order: 12, bodyHtml: individualExpertHtml },
    { slug: "templates-owner-or-ceo", title: "Templates for an owner or CEO", category: INDUSTRY, order: 13, bodyHtml: ownerCeoHtml },
  ];

  let created = 0;
  for (const p of posts) {
    const existing = await prisma.toolkitPost.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (existing) {
      console.log(`skip (exists): ${p.slug}`);
      continue;
    }
    await prisma.toolkitPost.create({
      data: {
        slug: p.slug,
        title: p.title,
        category: p.category,
        order: p.order,
        bodyHtml: p.bodyHtml,
        isPublished: true,
        authorEmail: "mail@mehrdadnaderi.com",
      },
    });
    created += 1;
    console.log(`created: ${p.slug}`);
  }
  console.log(`Toolkit seed done. Created ${created}, total defined ${posts.length}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
