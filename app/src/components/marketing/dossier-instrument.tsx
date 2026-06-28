import { ArrowRight, ArrowUpRight, Check, FileText, Minus, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Dossier — "The Instrument" direction
 * --------------------------------------------------------------------------
 * Marketing-only, presentational server components for the public Dossier
 * page — the site's primary proof / trust page. Shares the Home Instrument
 * design language: near-black / deep-navy base, cool indigo accent, gold
 * reserved for credential / review-standard moments, hairline rules, and
 * monospace metadata.
 *
 * Renders static content and links only. Changes no app logic, server
 * actions, auth, database, or application/payment flows. The sample dossier
 * proof asset is reused from /public/samples via the shared constants below
 * (the same files SampleDossierPreview links to); nothing about that asset is
 * modified.
 */

// Shared public sample-dossier assets (served from app/public/samples).
const SAMPLE_PDF_URL = "/samples/tenxpros-sample-dossier-excerpt.pdf";
const SAMPLE_HTML_URL = "/samples/tenxpros-sample-dossier-excerpt.html";
const SAMPLE_COVER_URL = "/samples/tenxpros-sample-dossier-cover.png";
const SAMPLE_SNAPSHOT_URL = "/samples/tenxpros-sample-dossier-snapshot.png";
const SAMPLE_ASSETS_URL = "/samples/tenxpros-sample-dossier-assets-rubric.png";
const SAMPLE_COVER_ALT =
  "Illustrative TenXPros Living AI Solution Dossier cover for fictional participant Maya R.";
const SAMPLE_DISCLAIMER =
  "Illustrative sample. Fictional participant. No real client data. Review labels are illustrative, not a certification decision.";

const PRIMARY_CTA =
  "whitespace-nowrap bg-indigo-500 text-white hover:bg-indigo-400 focus:ring-indigo-400 focus:ring-offset-[#070B14]";
const SECONDARY_CTA =
  "whitespace-nowrap border-white/20 bg-transparent text-slate-100 hover:bg-white/5 focus:ring-indigo-400 focus:ring-offset-[#070B14]";

function MonoLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-mono text-[0.7rem] uppercase tracking-[0.22em] text-indigo-300/80",
        className,
      )}
    >
      {children}
    </p>
  );
}

function SectionShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-white/10", className)}>
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-28">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ 1. Hero */

export function DossierHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-indigo-600/20 blur-[140px]"
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:px-8 md:py-28 lg:gap-16">
        <div className="flex flex-col justify-center">
          <MonoLabel>The proof artifact</MonoLabel>
          <h1 className="mt-6 text-[2.05rem] font-semibold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-5xl">
            The Living AI Solution Dossier is the work behind the credential.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:mt-6 sm:text-lg">
            Participants do not simply complete lessons. They turn a focused professional challenge
            into a structured, reviewed dossier: context, boundaries, workflow, evaluation, value,
            governance, and a 90-day path forward. It is a visible record of what you can think
            through and defend.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
            <span className="text-slate-200">Living</span> means the dossier is designed to be
            updated as your workflow, evidence, risks, and adoption context evolve.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              href={SAMPLE_HTML_URL}
              size="lg"
              className={PRIMARY_CTA}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              Preview the sample dossier
            </ButtonLink>
            <ButtonLink href="/apply" size="lg" variant="secondary" className={SECONDARY_CTA}>
              Apply for Certification
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
          <p className="mt-6 max-w-xl text-xs leading-5 text-slate-500">{SAMPLE_DISCLAIMER}</p>
        </div>

        {/* Hero visual — the real artifact, cover + two excerpt thumbnails */}
        <div className="flex items-center">
          <div className="w-full rounded-2xl border border-white/10 bg-[#0B1120] p-6 shadow-2xl shadow-black/40 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <MonoLabel className="text-slate-300">Living AI Solution Dossier</MonoLabel>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-indigo-200">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Reviewed
              </span>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-6 pt-6">
              <a
                href={SAMPLE_PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Preview the sample dossier (opens PDF in a new tab)"
                className="group flex-none rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#0B1120]"
              >
                <div className="rounded-xl border border-indigo-400/25 bg-white/[0.03] p-2.5 shadow-xl ring-1 ring-indigo-400/10 transition group-hover:border-indigo-400/40">
                  <img
                    src={SAMPLE_COVER_URL}
                    alt={SAMPLE_COVER_ALT}
                    width={1680}
                    height={2376}
                    loading="eager"
                    className="h-auto w-[168px] rounded-md sm:w-[196px]"
                  />
                </div>
                <span className="mt-2.5 block text-center font-mono text-[0.58rem] uppercase tracking-[0.16em] text-indigo-300/80">
                  Cover · Primary artifact
                </span>
              </a>
              <div className="flex flex-col justify-center gap-3">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-slate-500">
                  Supporting excerpts
                </p>
                <HeroThumb src={SAMPLE_SNAPSHOT_URL} label="Executive Snapshot" />
                <HeroThumb src={SAMPLE_ASSETS_URL} label="Eight Assets & Rubric" />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-400">
              <span>12 sections</span>
              <span className="text-indigo-200/90">Public review rubric</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroThumb({ src, label }: { src: string; label: string }) {
  return (
    <a
      href={SAMPLE_PDF_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-2 transition hover:border-indigo-400/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#0B1120]"
    >
      <img
        src={src}
        alt={`Illustrative sample dossier — ${label} page (fictional participant Maya R.)`}
        width={1000}
        height={1415}
        loading="lazy"
        className="h-full max-h-[88px] w-auto rounded border border-white/10 object-cover"
      />
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
    </a>
  );
}

/* --------------------------------------------------------- 2. What it proves */

const PROOF_PILLARS: Array<[string, string]> = [
  [
    "Clear problem framing",
    "A focused professional problem, scoped and defined precisely enough that someone else could review it.",
  ],
  [
    "Responsible solution design",
    "An AI-enabled workflow with explicit boundaries, governance, and the judgment calls left to a human.",
  ],
  [
    "Evidence-based value case",
    "An evaluation rubric, a test set, and a value argument — not a claim that it simply works.",
  ],
];

export function DossierProves() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>What the dossier proves</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          A dossier proves that your AI work can be understood, reviewed, and defended.
        </h2>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {PROOF_PILLARS.map(([title, desc], index) => (
          <div
            key={title}
            className="rounded-xl border border-white/10 bg-[#0B1120] p-6"
          >
            <span className="font-mono text-xs text-indigo-300">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-3 text-lg font-semibold leading-snug text-white">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{desc}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------- 3. 12-section anatomy */

const ANATOMY: Array<{ phase: string; weeks: string; sections: string[] }> = [
  {
    phase: "Frame",
    weeks: "Weeks 1–4",
    sections: ["Professional Context", "Problem Definition", "AI Suitability Assessment"],
  },
  {
    phase: "Design",
    weeks: "Weeks 5–8",
    sections: [
      "Context, Stakeholder & Initial Foresight Analysis",
      "Data & Evidence Review",
      "Workflow Before / After",
      "Risk, Ethics, Privacy & Compliance Review",
      "Responsible AI Solution Design",
    ],
  },
  {
    phase: "Prove",
    weeks: "Weeks 9–10",
    sections: ["Adoption & Communication Plan", "Value, Roadmap & Proof Plan"],
  },
  {
    phase: "Foresee",
    weeks: "Weeks 11–12",
    sections: ["Personal AI Foresight Plan", "Final Recommendation"],
  },
];

export function DossierAnatomy() {
  let running = 0;
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>The 12-section anatomy</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Twelve sections, organized by the TenX Method.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          Each section moves the work forward through Frame, Design, Prove, and Foresee — from
          defining the problem to leading what comes next.
        </p>
      </div>

      <div className="mt-12 space-y-4">
        {ANATOMY.map(({ phase, weeks, sections }, phaseIndex) => (
          <div
            key={phase}
            className="grid gap-6 rounded-xl border border-white/10 bg-[#0B1120] p-6 md:grid-cols-[220px_1fr] md:gap-10 md:p-8"
          >
            <div className="flex gap-4 md:flex-col md:gap-0 md:border-r md:border-white/10 md:pr-8">
              <span
                className="mt-1 hidden h-2 w-2 flex-none rounded-full bg-indigo-400 ring-4 ring-indigo-500/15 md:block"
                aria-hidden="true"
              />
              <div className="md:mt-4">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-indigo-300/70">
                  Phase {String(phaseIndex + 1).padStart(2, "0")} · {weeks}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{phase}</h3>
                <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-500">
                  {sections.length} {sections.length === 1 ? "section" : "sections"}
                </p>
              </div>
            </div>
            <ul className="divide-y divide-white/5">
              {sections.map((section) => {
                running += 1;
                return (
                  <li
                    key={section}
                    className="flex items-baseline gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="w-7 flex-none font-mono text-xs tabular-nums text-indigo-300/80">
                      {String(running).padStart(2, "0")}
                    </span>
                    <span className="text-[0.95rem] font-medium leading-6 text-slate-100">
                      {section}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------------ 4. Eight assets */

const ASSETS: Array<[string, string]> = [
  ["Personal AI Strategy Brief", "Your stance, scope, and adoption thesis."],
  ["AI Use-Case Portfolio", "Where AI earns its place in your work."],
  ["Interaction & Decision Kit", "Prompts, checks, and human-in-the-loop rules."],
  ["Grounded Domain Knowledge Pack", "The trusted sources your AI work stands on."],
  ["AI Evaluation Rubric & Test Set", "How you measure whether it actually works."],
  ["Custom Assistants & AI Workflows", "The working system — not a demo."],
  ["AI Value & Economics Case", "The evidence that it is worth doing."],
  ["Final Portfolio & 90-Day Roadmap", "What you ship next, and how you lead it."],
];

export function DossierAssetsMap() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>The eight assets map</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Eight assets become one professional dossier.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          Each asset is built during the program and assembled into the Living AI Solution
          Dossier — so the final artifact is the sum of reviewed, real work.
        </p>
      </div>
      <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {ASSETS.map(([title, desc], index) => (
          <li
            key={title}
            className="flex flex-col bg-[#0B1120] p-6 transition-colors hover:bg-[#0E1424]"
          >
            <span className="font-mono text-xs text-indigo-300">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-3 text-base font-semibold leading-snug text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0B1120] p-5">
        <ShieldCheck className="h-5 w-5 flex-none text-indigo-300" aria-hidden="true" />
        <p className="text-sm leading-6 text-slate-300">
          Assembled together, the eight assets form the reviewed Living AI Solution Dossier — the
          artifact at the center of the credential.
        </p>
      </div>
    </SectionShell>
  );
}

/* --------------------------------------------------------- 5. Review standard */

const REVIEW_CRITERIA = [
  "Problem clearly defined",
  "Risks and boundaries explicit",
  "Use-cases chosen and prioritized",
  "Evaluation rubric and test set exist",
  "Workflow is usable",
  "Value is shown with evidence",
  "Governance and confidentiality respected",
  "Roadmap is realistic",
];

export function DossierReviewStandard() {
  return (
    <SectionShell>
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <MonoLabel className="text-[#C9A961]/80">Review standard</MonoLabel>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
            Review is part of the product.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            A dossier is not graded for effort or attendance. It is reviewed against explicit
            criteria — for clarity, boundaries, prioritization, evaluation, usability, value
            evidence, governance, and roadmap realism.
          </p>
        </div>
        <div className="rounded-xl border border-[#C9A961]/25 bg-[#0B1120] p-8 ring-1 ring-[#C9A961]/10">
          <MonoLabel className="text-[#C9A961]/80">The eight review criteria</MonoLabel>
          <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {REVIEW_CRITERIA.map((item, index) => (
              <li key={item} className="flex items-start gap-3 text-slate-200">
                <Check className="mt-0.5 h-4 w-4 flex-none text-[#C9A961]" aria-hidden="true" />
                <span className="leading-6">
                  <span className="mr-1.5 font-mono text-xs text-[#C9A961]/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}

/* ----------------------------------------------------------- 6. Sample preview */

export function DossierSample() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>Sample dossier</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Preview the artifact before you apply.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          The sample dossier is fictional, but the structure and review standard are real. It
          shows a professional problem moving through the TenX Method, including reviewer notes,
          an intentional evidence gap, and the rubric mapping.
        </p>
      </div>

      {/* Curated proof gallery — equal-aspect artifacts, cover featured */}
      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        <SampleGalleryItem
          src={SAMPLE_COVER_URL}
          alt={SAMPLE_COVER_ALT}
          eyebrow="Cover"
          label="Living AI Solution Dossier"
          note="The full reviewed artifact — 12 sections in one document."
          featured
        />
        <SampleGalleryItem
          src={SAMPLE_SNAPSHOT_URL}
          eyebrow="Executive Snapshot"
          label="The one-page read"
          note="Problem, approach, and result at a glance."
        />
        <SampleGalleryItem
          src={SAMPLE_ASSETS_URL}
          eyebrow="Eight Assets & Rubric"
          label="The mapping"
          note="How the assets map to the dossier and review criteria."
        />
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ButtonLink
            href={SAMPLE_HTML_URL}
            size="lg"
            className={PRIMARY_CTA}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            Preview in browser
            <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </ButtonLink>
          <ButtonLink
            href={SAMPLE_PDF_URL}
            size="lg"
            variant="secondary"
            className={SECONDARY_CTA}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download PDF
          </ButtonLink>
        </div>
        <p className="max-w-md text-xs leading-5 text-slate-500">{SAMPLE_DISCLAIMER}</p>
      </div>
    </SectionShell>
  );
}

function SampleGalleryItem({
  src,
  alt,
  eyebrow,
  label,
  note,
  featured = false,
}: {
  src: string;
  alt?: string;
  eyebrow: string;
  label: string;
  note: string;
  featured?: boolean;
}) {
  return (
    <a
      href={SAMPLE_PDF_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${eyebrow} — preview the sample dossier (opens PDF in a new tab)`}
      className={cn(
        "group flex flex-col rounded-xl border bg-[#0B1120] p-3 transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#070B14]",
        featured
          ? "border-indigo-400/30 ring-1 ring-indigo-400/10 hover:border-indigo-400/50"
          : "border-white/10 hover:border-indigo-400/30",
      )}
    >
      <div className="overflow-hidden rounded-md border border-white/10 bg-white/[0.03]">
        <img
          src={src}
          alt={alt ?? `Illustrative sample dossier — ${eyebrow} page (fictional participant Maya R.)`}
          width={1000}
          height={1415}
          loading="lazy"
          className="h-auto w-full"
        />
      </div>
      <p
        className={cn(
          "mt-4 font-mono text-[0.62rem] uppercase tracking-[0.14em]",
          featured ? "text-indigo-300" : "text-indigo-300/80",
        )}
      >
        {eyebrow}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-white">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{note}</p>
    </a>
  );
}

/* --------------------------------------------------------- 7. What's different */

const GENERIC_COURSE = [
  "Watches lessons",
  "Learns tools",
  "Receives a completion certificate",
  "No reviewed professional artifact",
];

const TENX_DOSSIER = [
  "Starts from your real work",
  "Builds a structured AI adoption system",
  "Includes evaluation and governance",
  "Reviewed against explicit criteria",
  "Becomes a professional proof asset",
];

export function DossierDifference() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>What makes it different</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          A reviewed artifact is different from a completion certificate.
        </h2>
      </div>
      <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-2">
        <div className="bg-[#0B1120] p-8 md:p-10">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">
            Typical course experience
          </p>
          <ul className="mt-6 space-y-4">
            {GENERIC_COURSE.map((item) => (
              <li key={item} className="flex gap-3 text-slate-400">
                <Minus className="mt-0.5 h-5 w-5 flex-none text-slate-500" aria-hidden="true" />
                <span className="leading-6">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-[#0B1120] p-8 md:p-10">
          <MonoLabel>The TenXPros dossier</MonoLabel>
          <ul className="mt-6 space-y-4">
            {TENX_DOSSIER.map((item) => (
              <li key={item} className="flex gap-3 text-slate-100">
                <Check className="mt-0.5 h-5 w-5 flex-none text-indigo-400" aria-hidden="true" />
                <span className="leading-6">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}

/* --------------------------------------------------------------- 8. Final CTA */

export function DossierFinalCta() {
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
            Turn your expertise into a reviewed artifact.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            Apply for the Founding Charter with a serious professional problem. Payment happens
            only after acceptance.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/apply" size="lg" className={PRIMARY_CTA}>
              Apply for Certification
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/pricing" size="lg" variant="secondary" className={SECONDARY_CTA}>
              View pricing
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
