import { ArrowRight, Award, Check, FileText, Minus, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * About — "The Instrument" direction
 * --------------------------------------------------------------------------
 * Marketing-only, presentational server components for the public About page.
 * Shares the Instrument language used across the rebuilt pages: near-black
 * base, cool indigo action accent, gold reserved for review / credential /
 * seal moments, hairline rules, monospace metadata.
 *
 * Renders static content and links only — no app logic, server actions, auth,
 * database, or application/payment flows. Founder credibility is a restrained
 * trust layer, not the category definition. Only repo-verified founder claims
 * are published (see the round-1 report); the unsourced "19,000+ hours" figure
 * is intentionally omitted pending verification.
 */

const SAMPLE_PDF_URL = "/samples/tenxpros-sample-dossier-excerpt.pdf";

const PRIMARY_CTA =
  "whitespace-nowrap bg-indigo-500 text-white hover:bg-indigo-400 focus:ring-indigo-400 focus:ring-offset-[#070B14]";
const SECONDARY_CTA =
  "whitespace-nowrap border-white/20 bg-transparent text-slate-100 hover:bg-white/5 focus:ring-indigo-400 focus:ring-offset-[#070B14]";

const GOLD = "#C9A961";

function MonoLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[0.7rem] uppercase tracking-[0.22em] text-indigo-300/80", className)}>
      {children}
    </p>
  );
}

function SectionShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("border-t border-white/10", className)}>
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-28">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ 1. Hero */

const HERO_TRUST = ["Expertise + AI method", "Reviewed dossier", "Verifiable credential"];

const MISSION_READOUT: Array<[string, string]> = [
  ["Expertise", "Brought by you"],
  ["AI method", "Brought by TenXPros"],
  ["The work", "Becomes a reviewed dossier"],
  ["The credential", "Follows the evidence"],
];

export function AboutHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-indigo-600/20 blur-[140px]"
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:px-8 md:py-28 lg:gap-16">
        <div className="flex flex-col justify-center">
          <MonoLabel>Why TenXPros exists</MonoLabel>
          <h1 className="mt-6 text-[2.15rem] font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl">
            AI adoption has become professional judgment work.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:mt-6 sm:text-lg">
            TenXPros was built for experienced professionals who need more than AI tips. It helps
            them turn one real problem into reviewed AI adoption work they can explain, defend, and
            use.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/apply" size="lg" className={PRIMARY_CTA}>
              Apply for Founding Charter
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/program" size="lg" variant="secondary" className={SECONDARY_CTA}>
              See the method
            </ButtonLink>
          </div>
          <ul className="mt-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
            {HERO_TRUST.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-slate-400"
              >
                <Check className="h-3.5 w-3.5 flex-none text-indigo-300" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Mission / standard instrument panel */}
        <div className="flex items-center">
          <div className="w-full rounded-2xl border border-white/10 bg-[#0B1120] p-6 shadow-2xl shadow-black/40 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <MonoLabel className="text-slate-300">The standard</MonoLabel>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-500">Mission</span>
            </div>
            <ul className="pt-2">
              {MISSION_READOUT.map(([k, v]) => (
                <li key={k} className="flex items-baseline justify-between gap-4 border-b border-white/5 py-3 last:border-0">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-500">{k}</span>
                  <span className="text-right text-sm font-medium text-slate-100">{v}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-300/80" aria-hidden="true" />
              Earned through reviewed evidence
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------- 2. The problem */

export function AboutProblem() {
  return (
    <SectionShell>
      <div className="mx-auto max-w-4xl">
        <MonoLabel>The problem behind TenXPros</MonoLabel>
        <h2 className="mt-5 text-balance text-3xl font-semibold leading-tight text-white md:text-4xl">
          Most AI training stops too early.
        </h2>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
          Most courses teach tools, prompts, or concepts. The harder work starts after: deciding
          where AI belongs, what must remain human-led, how risks are bounded, and how value is
          actually proven. That is the work a serious professional is accountable for — and where
          TenXPros begins.
        </p>
      </div>
    </SectionShell>
  );
}

/* --------------------------------------------------- 3. The TenXPros answer */

const SPINE = [
  "Bring one real problem",
  "Frame the decision",
  "Design responsible AI use",
  "Prove value and risk boundaries",
  "Assemble the Living AI Solution Dossier",
  "Earn certification only when the dossier meets the standard",
];

export function AboutAnswer() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>The TenXPros answer</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          A method for turning expertise into reviewed AI adoption work.
        </h2>
      </div>
      <ol className="mt-12 overflow-hidden rounded-xl border border-white/10">
        {SPINE.map((step, index) => {
          const last = index === SPINE.length - 1;
          return (
            <li
              key={step}
              className={cn(
                "flex items-center gap-4 border-b border-white/10 px-5 py-5 last:border-0 sm:px-7",
                last ? "bg-[#0E1424]" : "bg-[#0B1120]",
              )}
            >
              <span
                className={cn("font-mono text-xs tabular-nums", last ? "text-[#C9A961]" : "text-indigo-300")}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={cn("text-[0.95rem] font-medium leading-6", last ? "text-white" : "text-slate-100")}>
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </SectionShell>
  );
}

/* ------------------------------------------------------------- 4. The standard */

const STANDARD_ELEMENTS: Array<[string, string]> = [
  ["Eight review criteria", "The same explicit, public criteria for every dossier."],
  ["A public sample dossier", "The standard is visible before anyone applies."],
  ["Clear review outcomes", "Certified · Strong Draft · Completed — honest, not pass/fail theatre."],
  ["Public verification", "Each credential is checkable on a public page."],
  ["Confidentiality boundaries", "Verification confirms the credential without exposing the work."],
];

export function AboutStandard() {
  return (
    <SectionShell>
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <MonoLabel className="text-[#C9A961]/80">The standard</MonoLabel>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
            The standard is the product.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
            TenXPros is not built around attendance. It is built around an explicit, inspectable
            standard — the criteria, the sample, the outcomes, and the verification that make the
            credential mean something.
          </p>
        </div>
        <ul className="rounded-2xl border border-[#C9A961]/25 bg-[#0B1120] p-6 ring-1 ring-[#C9A961]/10 sm:p-8">
          {STANDARD_ELEMENTS.map(([title, desc]) => (
            <li key={title} className="flex items-start gap-4 border-b border-white/5 py-4 first:pt-0 last:border-0 last:pb-0">
              <ShieldCheck className="mt-0.5 h-5 w-5 flex-none" style={{ color: GOLD }} aria-hidden="true" />
              <div>
                <h3 className="text-[0.95rem] font-semibold leading-snug text-white">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------- 5. Founder / architect */

export function AboutFounder() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>Who set the standard</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Who set the standard.
        </h2>
      </div>
      <div className="mt-10 flex flex-col gap-6 rounded-2xl border border-white/10 bg-[#0B1120] p-7 sm:flex-row sm:gap-8 md:p-10">
        <span
          className="flex h-14 w-14 flex-none items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/10"
          aria-hidden="true"
        >
          <Award className="h-6 w-6 text-indigo-300" />
        </span>
        <div className="space-y-3">
          <p className="text-base leading-7 text-slate-300">
            <span className="font-medium text-white">TenXPros was created by Mehrdad Naderi</span>,
            who designed the TenX Method and the review standard behind the credential. He built it
            because AI adoption has become professional judgment work — deciding where AI belongs,
            where it must stay human-led, and how to prove value responsibly — and experienced
            professionals needed a rigorous way to do that, not more tips.
          </p>
          <p className="text-sm leading-6 text-slate-400">
            His work centers on AI adoption, professional learning, and human–AI collaboration,
            drawing on AI training and product thinking.{" "}
            <a
              href="https://www.linkedin.com/in/mehrdad-naderi/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-300 underline-offset-2 hover:underline"
            >
              Read his public profile
            </a>
            .
          </p>
          <p className="text-sm leading-6 text-slate-400">
            The credential rests on the public standard — the sample dossier, the eight review
            criteria, the review outcomes, and verification — not on the name behind it.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------------- 6. Principles */

const PRINCIPLES: Array<[string, string]> = [
  ["Evidence over attendance", "The credential follows reviewed work, never hours logged."],
  ["Human accountability over automation theatre", "People stay responsible for judgment and outcomes."],
  ["Field-specific work over generic prompts", "Real problems from your domain, not canned exercises."],
  ["Confidentiality by design", "Redacted or fictionalized examples; sensitive data stays out."],
  ["Review standards before credentials", "The criteria are public and fixed before anyone is certified."],
  ["Practical value over AI hype", "What holds up to review, not what sounds impressive."],
  ["Clear limits over exaggerated claims", "We say plainly what this is — and what it is not."],
];

export function AboutPrinciples() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>Principles</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          The principles we hold to.
        </h2>
      </div>
      <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {PRINCIPLES.map(([title, desc], index) => {
          const isLast = index === PRINCIPLES.length - 1;
          return (
            <li
              key={title}
              className={cn(
                "flex flex-col bg-[#0B1120] p-6",
                isLast && "sm:col-span-2 lg:col-span-3 sm:flex-row sm:items-baseline sm:gap-5",
              )}
            >
              <span className="font-mono text-xs text-indigo-300">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className={cn(!isLast && "mt-3")}>
                <h3 className="text-base font-semibold leading-snug text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}

/* --------------------------------------------------------- 7. What it is not */

const NOT_LIST = [
  "Not a generic AI tools course",
  "Not a university degree or academic accreditation",
  "Not a prompt library",
  "Not a shortcut to guaranteed career outcomes",
  "Not a place to paste confidential data into tools",
  "Not certification by attendance",
];

export function AboutNot() {
  return (
    <SectionShell>
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <MonoLabel className="text-slate-400">Honest boundaries</MonoLabel>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
            What TenXPros is not.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
            Clarity is part of the trust. TenXPros is a private, evidence-based professional
            certification — and it is careful about what it does not claim to be.
          </p>
        </div>
        <ul className="rounded-xl border border-white/10 bg-[#0B1120] p-6 sm:p-8">
          {NOT_LIST.map((item) => (
            <li key={item} className="flex items-start gap-3 border-b border-white/5 py-3.5 first:pt-0 last:border-0 last:pb-0">
              <Minus className="mt-0.5 h-5 w-5 flex-none text-slate-500" aria-hidden="true" />
              <span className="leading-6 text-slate-300">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}

/* --------------------------------------------------------- 8. Trust before applying */

const TRUST_ITEMS: Array<[string, string]> = [
  ["A public sample dossier", "Read an illustrative dossier before you apply."],
  ["The eight public review criteria", "The exact standard the work is reviewed against."],
  ["Three honest certification outcomes", "Certified, Strong Draft, or Completed."],
  ["Apply first, pay only after acceptance", "No payment is requested before acceptance."],
];

export function AboutTrust() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>Trust before applying</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          You can inspect the standard before you apply.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          Nothing here asks for blind trust. The proof is public — and you can read it before you
          spend anything.
        </p>
      </div>
      <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST_ITEMS.map(([title, desc], index) => (
          <li key={title} className="flex flex-col bg-[#0B1120] p-6">
            <span className="font-mono text-xs text-indigo-300">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="mt-3 text-base font-semibold leading-snug text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ButtonLink href={SAMPLE_PDF_URL} size="lg" className={PRIMARY_CTA} target="_blank" rel="noopener noreferrer">
          <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
          Preview sample dossier
        </ButtonLink>
        <ButtonLink href="/certification" size="lg" variant="secondary" className={SECONDARY_CTA}>
          See the review standard
        </ButtonLink>
      </div>
      <p className="mt-6 max-w-3xl text-xs leading-5 text-slate-500">
        To be clear about what it is: TenXPros is a private professional certification — not a
        university degree, academic accreditation, or a guarantee of job, income, or business
        outcomes. The credential reflects reviewed work.
      </p>
    </SectionShell>
  );
}

/* --------------------------------------------------------------- 9. Final CTA */

export function AboutFinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-white/10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[140px]"
      />
      <div className="relative mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <MonoLabel>Founding Charter</MonoLabel>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
            Bring your expertise. We bring the AI method.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            Apply for the Founding Charter with one real professional problem. Payment happens only
            after acceptance.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/apply" size="lg" className={PRIMARY_CTA}>
              Apply for Founding Charter
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/program" size="lg" variant="secondary" className={SECONDARY_CTA}>
              See the method
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
