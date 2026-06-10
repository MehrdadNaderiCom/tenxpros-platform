/**
 * Default playbook content for TenXPros Command, seeded into MarketingTemplate
 * on first use and editable in the admin afterwards. Faithful to the founder's
 * original Command playbook (outreach, follow-ups, objections, assets,
 * discovery questions, operating principles).
 */

export type SeedTemplate = {
  key: string;
  category: "outreach" | "follow_up" | "objection" | "asset" | "question" | "principle";
  title: string;
  body: string;
  sortOrder: number;
};

export const PLAYBOOK_SEED: SeedTemplate[] = [
  // ---------------------------------------------------------------- outreach
  {
    key: "outreach_warm",
    category: "outreach",
    title: "Warm: to someone who knows you",
    sortOrder: 1,
    body: `Hi {first_name},
It's been a while. Hope you're well.

Lately I've been building something I thought might interest you:
a practical program for non-technical professionals who want to actually
move AI into their real work. Not just learn tools, but ship a
defensible deliverable. It's called TenXPros.

I'm sharing it first with a handful of people I trust. If it's relevant
to you or someone you know, happy to spend 20 minutes on a call.`,
  },
  {
    key: "outreach_referral",
    category: "outreach",
    title: "Referral request: explicitly not a sales pitch",
    sortOrder: 2,
    body: `Hi {first_name},
A small favor, not a pitch.

I'm launching TenXPros: helping non-technical professionals genuinely
adopt AI in their work and produce a defensible Living AI Solution
Dossier. I'm looking for the right first cohort.

Anyone come to mind who's actively struggling to land AI inside their
team or role? Even just a name or intro would mean a lot.`,
  },
  {
    key: "outreach_cold",
    category: "outreach",
    title: "Targeted cold: the first line must be 100% personal",
    sortOrder: 3,
    body: `{personal_opening_line_about_them}

{first_name}, I'm {your_name}: 19,000+ hours of technical teaching,
30+ startups on AI adoption. What I keep seeing: many {role/industry}
folks have access to AI tools but still can't produce a defensible
output they can show their boss or client. That's the gap I work on.

If it's relevant, want to do a quick 20-minute call? No commitment.
If it's not a fit, I'll say so right there.`,
  },
  // -------------------------------------------------------------- follow-ups
  {
    key: "followup_1",
    category: "follow_up",
    title: "Follow-up #1 (+3 days): small value",
    sortOrder: 1,
    body: `{first_name}, quick follow-up. Wanted to share one angle in case
it's useful: most teams I work with don't have an AI adoption problem,
they have a *defensibility* problem. They use AI; they can't prove
the output is trustworthy or repeatable.

If that resonates, happy to walk through how we close that gap.`,
  },
  {
    key: "followup_2",
    category: "follow_up",
    title: "Follow-up #2 (+7 days): sample dossier",
    sortOrder: 2,
    body: `{first_name}, sending one short artifact in case it's useful: a
2-page anonymized sample of the Living AI Solution Dossier we
produce in TenXPros. It's the actual deliverable, not a brochure.

If it's interesting, 20 minutes any day this week?`,
  },
  {
    key: "followup_3",
    category: "follow_up",
    title: "Follow-up #3 (+7 days): timing reset",
    sortOrder: 3,
    body: `{first_name}, last note from me on this for now. If now isn't the
right moment, totally understand. When would be a better time to
reconnect? I'll wait for your signal.`,
  },
  // -------------------------------------------------------------- objections
  {
    key: "objection_price",
    category: "objection",
    title: "\"$997 is expensive\"",
    sortOrder: 1,
    body: "Re-anchor on the deliverable and ROI: a defensible dossier. Show the cost of NOT solving the problem (stalled AI adoption, no career artifact).",
  },
  {
    key: "objection_diy",
    category: "objection",
    title: "\"Why not just do it myself with ChatGPT?\"",
    sortOrder: 2,
    body: "Access to a tool is not the ability to adopt. What they're buying is a framework + reviewed proof + structured judgment, not access to AI.",
  },
  {
    key: "objection_time",
    category: "objection",
    title: "\"I don't have 12 weeks\"",
    sortOrder: 3,
    body: "The deliverables ARE their real work. The program wraps around their job, not on top of it.",
  },
  {
    key: "objection_trust",
    category: "objection",
    title: "\"I don't know you or TenXPros\"",
    sortOrder: 4,
    body: "Founder credibility (19k+ hours, 30+ startups, HEC) + the public review standard + case study/pilot + apply-first to de-risk them.",
  },
  {
    key: "objection_think",
    category: "objection",
    title: "\"Let me think about it\"",
    sortOrder: 5,
    body: "Find the real objection. If commitment is too high, offer the Diagnostic Sprint as a lower-commitment entry point.",
  },
  // ------------------------------------------------------------------ assets
  {
    key: "asset_sample_dossier",
    category: "asset",
    title: "#1 Anonymized Sample Dossier",
    sortOrder: 1,
    body: "The gateway. Shows the concrete output. Without it, every other asset is 40-50% weaker. Anonymize a real case from a previous cohort or consulting client.",
  },
  {
    key: "asset_founder_letter",
    category: "asset",
    title: "#2 Founder Letter",
    sortOrder: 2,
    body: "Start with credibility, not product. 19,000+ teaching hours, 30+ startups, HEC.",
  },
  {
    key: "asset_review_standard",
    category: "asset",
    title: "#3 Review standard + reviewer identities",
    sortOrder: 3,
    body: "Clear, trustworthy, no contradiction. This is the credibility layer the site needs front and center.",
  },
  {
    key: "asset_linkedin",
    category: "asset",
    title: "#4 Clean LinkedIn profile",
    sortOrder: 4,
    body: "The 5-second trust test: headline, About section (3 short paragraphs), professional photo.",
  },
  // --------------------------------------------------------------- questions
  {
    key: "question_defensible",
    category: "question",
    title: "Discovery question 1",
    sortOrder: 1,
    body: "Have you ever built a real AI use-case for your team or work where you could measure the result and defend it in front of your manager or client? What happened?",
  },
  {
    key: "question_trustworthy",
    category: "question",
    title: "Discovery question 2",
    sortOrder: 2,
    body: "When you use AI now, how do you show the output to others so they're convinced it's trustworthy and repeatable, not a one-off answer?",
  },
  {
    key: "question_failed",
    category: "question",
    title: "Discovery question 3",
    sortOrder: 3,
    body: "What's the biggest place you tried AI and it didn't land? Was the problem the tool or the method/framework?",
  },
  {
    key: "question_promotion",
    category: "question",
    title: "Discovery question 4",
    sortOrder: 4,
    body: "If three months from now you had a single AI deliverable that genuinely added value to your work and you could use to get promoted, what would it be?",
  },
  // -------------------------------------------------------------- principles
  {
    key: "principle_edit_first_line",
    category: "principle",
    title: "Edit the first line, always",
    sortOrder: 1,
    body: "Drafts and templates are starting points. The first line of every message must be rewritten to be 100% personal to the prospect, or it does not get sent.",
  },
  {
    key: "principle_followups_first",
    category: "principle",
    title: "Follow-ups before new cold messages",
    sortOrder: 2,
    body: "Clear today's due follow-ups (FU1/FU2/FU3) before sending any new cold outreach. Compound value lives in the second and third touches.",
  },
  {
    key: "principle_pivot_rule",
    category: "principle",
    title: "The 150/10 pivot rule",
    sortOrder: 3,
    body: "If 150 messages produce fewer than 10 calls, change ONE variable (opener, channel mix, or segment) and run the next 50. If zero paid after that, change the ICP or the offer (e.g., Diagnostic Sprint), not the effort.",
  },
  {
    key: "principle_trust_first",
    category: "principle",
    title: "Founder-led, trust-first",
    sortOrder: 4,
    body: "Sell with credibility and proof (sample dossier, review standard), never pressure. Stay under platform caps; protect the long-term reputation of the domain and the founder.",
  },
];
