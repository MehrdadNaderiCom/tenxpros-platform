import { ArrowRight, Award, Check, FileText, Minus, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Certification — "The Instrument" direction
 * --------------------------------------------------------------------------
 * Marketing-only, presentational server components for the public
 * Certification page. Shares the Home / Dossier / Pricing / Apply Instrument
 * language: near-black base, cool indigo action accent, gold reserved for
 * review / credential / seal moments, hairline rules, monospace metadata.
 *
 * Renders static content and links only. Changes no app logic, server actions,
 * auth, database, or the real verification/badge/certificate routes. The
 * verification panel here is ILLUSTRATIVE and non-clickable — the live
 * verification routes (/verify/[code], /certificate/[id]) are untouched and
 * require a real code, so nothing here invents real participant data.
 */

const SAMPLE_PDF_URL = "/samples/tenxpros-sample-dossier-excerpt.pdf";
const SAMPLE_HTML_URL = "/samples/tenxpros-sample-dossier-excerpt.html";
const SAMPLE_VERIFY_URL = "/samples/tenxpros-sample-verification.html";
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

const HERO_TRUST = ["Reviewed dossier", "Public criteria", "Verifiable badge"];

const CREDENTIAL_READOUT: Array<[string, string]> = [
  ["Artifact", "Living AI Solution Dossier"],
  ["Review status", "Against 8 public criteria"],
  ["Credential decision", "Certified · Strong Draft · Completed"],
  ["Verification", "Public page · Badge ID"],
];

export function CertHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-indigo-600/20 blur-[140px]"
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:px-8 md:py-28 lg:gap-16">
        <div className="flex flex-col justify-center">
          <MonoLabel>Reviewed evidence · Verifiable credential</MonoLabel>
          <h1 className="mt-6 text-[2.15rem] font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl">
            Certification is earned, not attended.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:mt-6 sm:text-lg">
            TenXPros certification is awarded when your Living AI Solution Dossier meets an explicit
            review standard. The credential reflects reviewed AI adoption work — not video
            completion.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/apply" size="lg" className={PRIMARY_CTA}>
              Apply for Certification
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink
              href={SAMPLE_PDF_URL}
              size="lg"
              variant="secondary"
              className={SECONDARY_CTA}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              Preview sample dossier
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

        {/* Credential instrument panel — a gold seal moment */}
        <div className="flex items-center">
          <div className="w-full rounded-2xl border border-white/10 bg-[#0B1120] p-6 shadow-2xl shadow-black/40 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <MonoLabel className="text-slate-300">Credential</MonoLabel>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.16em]"
                style={{ borderColor: `${GOLD}55`, color: GOLD }}
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Certified
              </span>
            </div>
            <ul className="pt-2">
              {CREDENTIAL_READOUT.map(([k, v]) => (
                <li key={k} className="flex items-baseline justify-between gap-4 border-b border-white/5 py-3 last:border-0">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-500">{k}</span>
                  <span className="text-right text-sm font-medium text-slate-100">{v}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-400">
              <Award className="h-3.5 w-3.5" style={{ color: GOLD }} aria-hidden="true" />
              Earned through reviewed work
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------- 2. What it signals */

const SIGNALS = [
  "A real professional problem was framed",
  "AI boundaries and risks were identified",
  "Use cases were chosen and prioritized",
  "An evaluation rubric and test set exist",
  "The workflow is usable",
  "Value is shown with evidence",
  "Governance and confidentiality are respected",
  "A realistic 90-day roadmap exists",
];

export function CertSignals() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>What it means</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          What the credential signals.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          A Certified TenXPro credential is a practical signal: it says specific, reviewable work
          was done — not that lessons were watched.
        </p>
      </div>
      <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2">
        {SIGNALS.map((item, index) => (
          <li key={item} className="flex items-start gap-3 bg-[#0B1120] p-6">
            <span className="font-mono text-xs text-indigo-300">{String(index + 1).padStart(2, "0")}</span>
            <span className="text-[0.95rem] leading-6 text-slate-100">{item}</span>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

/* ------------------------------------------------------- 3. What it is not */

const NOT_LIST = [
  "Not a university degree",
  "Not academic accreditation",
  "Not a certificate for watching videos",
  "Not a guarantee of employment, income, promotion, or business results",
  "Not proof that AI can safely replace human judgment",
];

export function CertNot() {
  return (
    <SectionShell>
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <MonoLabel className="text-slate-400">Honest boundaries</MonoLabel>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
            What it is not.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            A credible credential is clear about its limits. TenXPros certification is a private,
            evidence-based professional credential — and nothing more than that.
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

/* --------------------------------------------------------- 4. Review criteria */

const CRITERIA = [
  "Problem clearly defined",
  "Risks and boundaries explicit",
  "Use-cases chosen and prioritized",
  "Evaluation rubric and test set exist",
  "Workflow is usable",
  "Value is shown with evidence",
  "Governance and confidentiality respected",
  "Roadmap is realistic",
];

export function CertCriteria() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel className="text-[#C9A961]/80">The review standard</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          The eight review criteria.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          Every dossier is reviewed against the same explicit, public criteria. The standard is
          visible before you apply — and it is the same standard that earns the credential.
        </p>
      </div>
      <div className="mt-12 rounded-2xl border border-[#C9A961]/30 bg-[#0B1120] p-7 ring-1 ring-[#C9A961]/10 md:p-10">
        <ul className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {CRITERIA.map((item, index) => (
            <li key={item} className="flex items-start gap-4 border-b border-white/5 pb-5 last:border-0 sm:[&:nth-last-child(2)]:border-0">
              <span
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full border font-mono text-xs"
                style={{ borderColor: `${GOLD}66`, color: GOLD }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="pt-1 text-[0.95rem] font-medium leading-6 text-slate-100">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}

/* --------------------------------------------------------- 5. Review outcomes */

const OUTCOMES: Array<{ title: string; desc: string; tone: "gold" | "indigo" | "neutral" }> = [
  {
    title: "Certified",
    desc: "The dossier meets the review standard and earns the credential.",
    tone: "gold",
  },
  {
    title: "Strong Draft",
    desc: "The work is close; specific revisions are returned before certification.",
    tone: "indigo",
  },
  {
    title: "Completed",
    desc: "The program is finished; the credential is not yet earned. A real, professional outcome, not a failure.",
    tone: "neutral",
  },
];

export function CertOutcomes() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>Review outcomes</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Three outcomes. One standard.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          Review is not pass/fail theatre. The same standard produces three honest outcomes.
        </p>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {OUTCOMES.map(({ title, desc, tone }) => {
          const gold = tone === "gold";
          const indigo = tone === "indigo";
          return (
            <div
              key={title}
              className={cn(
                "rounded-xl border bg-[#0B1120] p-7",
                gold && "border-[#C9A961]/40 ring-1 ring-[#C9A961]/15",
                indigo && "border-indigo-400/30 ring-1 ring-indigo-400/10",
                tone === "neutral" && "border-white/10",
              )}
            >
              <div className="flex items-center gap-2">
                {gold ? <ShieldCheck className="h-4 w-4" style={{ color: GOLD }} aria-hidden="true" /> : null}
                {indigo ? <Check className="h-4 w-4 text-indigo-300" aria-hidden="true" /> : null}
                <h3
                  className={cn(
                    "text-lg font-semibold",
                    gold ? "" : indigo ? "text-indigo-100" : "text-white",
                  )}
                  style={gold ? { color: GOLD } : undefined}
                >
                  {title}
                </h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{desc}</p>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

/* --------------------------------------------------- 6. The dossier behind it */

const RANKS: Array<[string, string, string]> = [
  ["AI-Ready Professional", "Frame", "Earned on completing the Frame phase."],
  ["AI Problem Solver & Solution Designer", "Design", "Earned on completing the Design phase."],
  ["Future-Ready AI Solution Designer", "Prove · Foresee", "Earned on completing the Prove and Foresee phases."],
];

export function CertMilestones() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>Milestones, ranks &amp; the seal</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Milestones, ranks, and the final credential.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          Progress is marked by reviewed work, not attendance, and it builds toward one credential.
        </p>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {/* Module milestones */}
        <div className="rounded-xl border border-white/10 bg-[#0B1120] p-6">
          <MonoLabel className="text-slate-400">Module milestones</MonoLabel>
          <p className="mt-3 text-2xl font-semibold text-white">11</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            One per core module, earned through the work you submit — not for watching or attending.
          </p>
        </div>

        {/* Ranks */}
        <div className="rounded-xl border border-white/10 bg-[#0B1120] p-6 lg:col-span-2">
          <MonoLabel className="text-slate-400">Ranks · progress through the method</MonoLabel>
          <ul className="mt-4 space-y-px">
            {RANKS.map(([name, phase, desc]) => (
              <li key={name} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-white/5 py-3 last:border-0">
                <span>
                  <span className="block text-[0.95rem] font-semibold text-white">{name}</span>
                  <span className="text-xs leading-5 text-slate-400">{desc}</span>
                </span>
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-indigo-300/80">{phase}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Capstone seal — gold credential moment */}
      <div className="mt-4 flex flex-col gap-4 rounded-xl border border-[#C9A961]/30 bg-[#0B1120] p-6 ring-1 ring-[#C9A961]/10 sm:flex-row sm:items-center sm:gap-6 md:p-8">
        <span
          className="flex h-12 w-12 flex-none items-center justify-center rounded-full border"
          style={{ borderColor: `${GOLD}55` }}
          aria-hidden="true"
        >
          <ShieldCheck className="h-5 w-5" style={{ color: GOLD }} />
        </span>
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em]" style={{ color: `${GOLD}cc` }}>
            The final credential
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">Certified TenXPro Capstone Seal</h3>
          <p className="mt-1.5 text-sm leading-6 text-slate-300">
            The seal belongs to certified dossier work — earned when the reviewed dossier meets the
            standard. Verification confirms credential metadata without exposing the confidential
            contents of your work.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}

export function CertDossier() {
  return (
    <SectionShell>
      <div className="grid gap-10 md:grid-cols-[0.78fr_1.22fr] md:items-center">
        <a
          href={SAMPLE_PDF_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Preview the sample dossier (opens PDF in a new tab)"
          className="group block justify-self-center rounded-xl border border-white/10 bg-white/[0.03] p-3 shadow-2xl shadow-black/40 transition hover:border-indigo-400/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#070B14]"
        >
          <img
            src={SAMPLE_COVER_URL}
            alt={SAMPLE_COVER_ALT}
            width={1680}
            height={2376}
            loading="lazy"
            className="h-auto w-full max-w-[260px] rounded-lg"
          />
          <span className="mt-3 block text-center font-mono text-[0.58rem] uppercase tracking-[0.16em] text-slate-500">
            Living AI Solution Dossier · Cover
          </span>
        </a>
        <div>
          <MonoLabel>Work behind the credential</MonoLabel>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
            The credential has work behind it.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
            Before applying, you can inspect an illustrative dossier. It shows the structure,
            reviewer notes, an intentional evidence gap, and how the work maps to the rubric.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
            <SampleThumb src={SAMPLE_SNAPSHOT_URL} label="Executive Snapshot" />
            <SampleThumb src={SAMPLE_ASSETS_URL} label="Eight Assets & Rubric" />
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href={SAMPLE_HTML_URL} size="lg" className={PRIMARY_CTA} target="_blank" rel="noopener noreferrer">
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              Preview in browser
            </ButtonLink>
            <ButtonLink href={SAMPLE_PDF_URL} size="lg" variant="secondary" className={SECONDARY_CTA} target="_blank" rel="noopener noreferrer">
              Download PDF
            </ButtonLink>
          </div>
          <p className="mt-6 max-w-xl text-xs leading-5 text-slate-500">{SAMPLE_DISCLAIMER}</p>
        </div>
      </div>
    </SectionShell>
  );
}

function SampleThumb({ src, label }: { src: string; label: string }) {
  return (
    <a
      href={SAMPLE_PDF_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-lg border border-white/10 bg-[#0B1120] p-2 transition hover:border-indigo-400/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#070B14]"
    >
      <img
        src={src}
        alt={`Illustrative sample dossier — ${label} page (fictional participant Maya R.)`}
        width={1000}
        height={1415}
        loading="lazy"
        className="h-auto w-full rounded border border-white/10"
      />
      <span className="mt-2 block font-mono text-[0.58rem] uppercase tracking-[0.14em] text-indigo-300/80">
        {label}
      </span>
    </a>
  );
}

/* ----------------------------------------------------------- 7. Verification */

const VERIFY_ROWS: Array<[string, string]> = [
  ["Recipient", "Illustrative · Maya R."],
  ["Credential", "Certified TenXPro"],
  ["Status", "Active"],
  ["Issued", "Illustrative date"],
  ["Verification code", "TENX-0000-0000"],
];

const VERIFY_POINTS = [
  "Each earned credential is issued with a public verification page.",
  "When a credential is issued, anyone can check it, its status, and its issue date.",
  "Verification shows recipient, credential status, issue date, and credential metadata.",
  "It does not expose the confidential contents of your dossier.",
];

const REVIEW_MECHANICS = [
  "Your dossier is assessed against the eight public criteria — the same standard shown before you apply.",
  "The review is performed by a qualified human reviewer using the TenXPros review standard.",
  "For the founding cohort, review is handled directly by the TenXPros review team and program architect.",
  "Outcomes are Certified, Strong Draft, or Completed.",
  "A Strong Draft includes specific revision guidance; certification is earned only when the dossier meets the standard.",
  "Verification confirms credential metadata; it does not expose the confidential contents of your dossier.",
];

export function CertReviewMechanics() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>Review mechanics</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          How dossier review works.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          Review is a human judgment against an explicit standard — not a quiz and not attendance.
        </p>
      </div>
      <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2">
        {REVIEW_MECHANICS.map((item, index) => (
          <li key={item} className="flex items-start gap-3 bg-[#0B1120] p-6">
            <span className="font-mono text-xs text-indigo-300">{String(index + 1).padStart(2, "0")}</span>
            <span className="text-[0.95rem] leading-6 text-slate-200">{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 rounded-xl border border-white/10 bg-[#0B1120] p-6 md:p-8">
        <MonoLabel className="text-slate-300">Who reviews the dossier?</MonoLabel>
        <p className="mt-4 text-[0.95rem] leading-7 text-slate-300">
          For the Founding Charter, dossier review is conducted by the TenXPros review team and
          program architect using the same eight public criteria. Review is human-led,
          section-specific, and based on the evidence in the dossier. As the program grows,
          additional reviewers may be added under the same published standard.
        </p>
      </div>
      <p className="mt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-500">
        No certification outcome is guaranteed.
      </p>
    </SectionShell>
  );
}

export function CertVerification() {
  return (
    <SectionShell>
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <MonoLabel>Verification</MonoLabel>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
            How verification works.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
            A credential is only as good as the ability to check it. When a credential is earned, it
            is issued with a public verification page — confirming the credential without revealing
            the work behind it.
          </p>
          <ul className="mt-6 space-y-3">
            {VERIFY_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-slate-200">
                <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-indigo-400" aria-hidden="true" />
                <span className="leading-6">{point}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-xl text-sm leading-6 text-slate-400">
            When a credential is earned, verification confirms credential metadata without exposing
            the dossier.{" "}
            <a
              href={SAMPLE_VERIFY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-300 underline-offset-2 hover:underline"
            >
              View illustrative verification example
            </a>
            .
          </p>
        </div>

        {/* Illustrative, non-clickable verification panel */}
        <div className="rounded-2xl border border-white/10 bg-[#0B1120] p-6 shadow-2xl shadow-black/40 sm:p-7">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-300">
              <Award className="h-4 w-4" style={{ color: GOLD }} aria-hidden="true" />
              TenXPros verification
            </span>
            <span className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-slate-500">
              Illustrative
            </span>
          </div>
          <dl className="pt-2">
            {VERIFY_ROWS.map(([k, v]) => {
              const status = k === "Status";
              return (
                <div key={k} className="flex items-baseline justify-between gap-4 border-b border-white/5 py-3 last:border-0">
                  <dt className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-500">{k}</dt>
                  <dd className="text-right">
                    {status ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.14em]"
                        style={{ borderColor: `${GOLD}55`, color: GOLD }}
                      >
                        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                        {v}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-slate-100">{v}</span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="mt-4 border-t border-white/10 pt-4 text-[0.7rem] leading-5 text-slate-500">
            Illustrative verification panel — not a real record. Live credentials are verified on a
            public page; no real personal data is shown here.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------- 8. Certification path */

const PATH = [
  "Apply with your expertise",
  "Complete the diagnostic and personalized path",
  "Build the eight assets",
  "Assemble the Living AI Solution Dossier",
  "Submit for review",
  "Revise if needed",
  "Earn certification when the dossier meets the standard",
  "Share the verifiable credential",
];

export function CertPath() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>The path</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          How you get there.
        </h2>
      </div>
      <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {PATH.map((step, index) => {
          const earns = index === 6;
          return (
            <li
              key={step}
              className={cn("flex flex-col bg-[#0B1120] p-6", earns && "bg-[#0E1424]")}
            >
              <span
                className={cn("font-mono text-xs", earns ? "text-[#C9A961]" : "text-indigo-300")}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="mt-3 text-[0.95rem] font-medium leading-6 text-slate-100">{step}</p>
            </li>
          );
        })}
      </ol>
    </SectionShell>
  );
}

/* ------------------------------------------------------------------- 9. FAQ */

const FAQS: Array<[string, string]> = [
  ["What makes the credential credible?", "Transparent work: a reviewed artifact, published criteria, clear outcomes, and a verifiable badge. Anyone can see the standard before and after."],
  ["What does the reviewer check?", "Your dossier is assessed against the eight public criteria: problem clarity, risk and boundaries, prioritization, evaluation, usability, value evidence, governance, and roadmap realism."],
  ["What if my dossier is not certified on the first review?", "You receive specific revisions (a “Strong Draft” outcome) and can revise toward the standard. Review is part of the program, not a one-shot exam."],
  ["Can I still finish the program without earning the credential?", "Yes. “Completed” means you finished the program; certification is a separate, evidence-based decision. Both are honest professional outcomes."],
  ["Can employers verify it?", "Yes. Each credential has a public verification page showing the credential, its status, and its issue date."],
  ["How can I use the credential?", "Share the verification link with clients, employers, or your network, add the badge to a profile, and use the dossier itself as reviewed proof of how you think through AI adoption."],
  ["Does verification reveal my confidential work?", "No. Verification confirms the credential and its metadata; it does not expose the contents of your dossier."],
  ["Is this suitable for non-technical professionals?", "Yes. You bring judgment and your field expertise; no coding is required to earn the credential."],
  ["What if my field is regulated?", "Keep regulated or confidential data out of the work and use general or redacted examples. Governance and confidentiality are part of the review."],
  ["How is this different from a university or accredited program?", "It is a private professional certification, not a university degree or an accredited academic program. Its weight comes from reviewed work, public criteria, and verification rather than an accreditation body, and it does not on its own guarantee a job, income, or promotion."],
];

export function CertFaq() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>Questions</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Honest answers about the credential.
        </h2>
      </div>
      <div className="mt-10 overflow-hidden rounded-xl border border-white/10">
        {FAQS.map(([q, a]) => (
          <details key={q} className="group border-b border-white/10 last:border-0 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-4 bg-[#0B1120] px-5 py-4 text-[0.95rem] font-medium text-white transition hover:bg-[#0E1424] sm:px-7">
              {q}
              <span className="flex-none font-mono text-lg text-indigo-300 transition group-open:rotate-45" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="bg-[#0B1120] px-5 pb-5 text-sm leading-6 text-slate-300 sm:px-7">{a}</div>
          </details>
        ))}
      </div>
    </SectionShell>
  );
}

/* --------------------------------------------------------------- 10. Final CTA */

export function CertFinalCta() {
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
            Bring your expertise. Build work that can be reviewed.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            Apply for the Founding Charter. Payment happens only after acceptance.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/apply" size="lg" className={PRIMARY_CTA}>
              Apply for Certification
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink
              href={SAMPLE_PDF_URL}
              size="lg"
              variant="secondary"
              className={SECONDARY_CTA}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              Preview sample dossier
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
