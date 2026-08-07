import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Check,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Home, "The Instrument" direction
 * --------------------------------------------------------------------------
 * Marketing-only, presentational server components for the public Home page.
 * Near-black / deep-navy base, cool indigo accent, restrained gold reserved
 * for credential moments, hairline rules, and monospace labels.
 *
 * These components render static content and links only. They change no app
 * logic, server actions, auth, database, or application/payment flows. The
 * sample dossier proof asset is reused from /public/samples via the shared
 * asset constants below (the same files the SampleDossierPreview component
 * links to) so nothing about that asset is duplicated or altered.
 */

// Shared public sample-dossier assets (served from app/public/samples).
const SAMPLE_PDF_URL = "/samples/tenxpros-sample-dossier-excerpt.pdf";
const SAMPLE_HTML_URL = "/samples/tenxpros-sample-dossier-excerpt.html";
const SAMPLE_COVER_URL = "/samples/tenxpros-sample-dossier-cover.png";
const SAMPLE_COVER_ALT =
  "Illustrative TenXPros Living AI Solution Dossier cover for fictional participant Maya R.";
const SAMPLE_DISCLAIMER =
  "Illustrative sample. Fictional participant. No real client data. Review labels are illustrative, not a certification decision.";

// Instrument palette (kept here so every section reads from one source).
// `whitespace-nowrap` keeps CTA labels on a single line on desktop; on mobile the
// buttons are full-width (flex-col) so they remain readable without wrapping mid-label.
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
  bordered = true,
}: {
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <section
      className={cn(bordered && "border-t border-white/10", className)}
    >
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-28">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ 1. Hero */

const QUICK_FACTS = [
  "100-day journey",
  "4-phase method",
  "1 reviewed dossier",
  "Verifiable credential",
];

const METHOD_READOUT = [
  ["Frame", "Weeks 1-4"],
  ["Design", "Weeks 5-8"],
  ["Prove", "Weeks 9-10"],
  ["Foresee", "Weeks 11-12"],
];

export function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      {/* restrained indigo glow, engineered, not flashy */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-indigo-600/20 blur-[140px]"
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:px-8 md:py-28 lg:gap-16">
        <div className="flex flex-col justify-center">
          <MonoLabel>You bring the expertise. We bring the AI method.</MonoLabel>
          <h1 className="mt-6 text-[2.15rem] font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-6xl">
            Lead AI adoption in your field.{" "}
            <span className="text-slate-400">Don’t just use AI.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:mt-6 sm:text-lg">
            A selective 100-day journey for experienced professionals, built around a 12-week guided
            learning path. Bring your expertise, find where AI truly belongs in your field, and finish
            with a reviewed Living AI Solution Dossier you can defend.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/apply" size="lg" className={PRIMARY_CTA}>
              Apply for Founding Charter
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
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
            Apply first. Pay only after acceptance.
          </p>
          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-4">
            {QUICK_FACTS.map((fact) => {
              const [value, ...rest] = fact.split(" ");
              return (
                <div key={fact} className="bg-[#0B1120] px-4 py-4">
                  <dt className="text-2xl font-semibold text-white">{value}</dt>
                  <dd className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">
                    {rest.join(" ")}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        {/* Instrument panel, real artifact framed by method / review metadata */}
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
              <figure className="flex-none">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 shadow-lg">
                  <img
                    src={SAMPLE_COVER_URL}
                    alt={SAMPLE_COVER_ALT}
                    width={1680}
                    height={2376}
                    loading="eager"
                    className="h-auto w-[150px] rounded-md sm:w-[176px]"
                  />
                </div>
                <figcaption className="mt-2 text-center font-mono text-[0.58rem] uppercase tracking-[0.16em] text-slate-500">
                  Excerpt · 12 sections
                </figcaption>
              </figure>
              <ul className="flex flex-col justify-center">
                {METHOD_READOUT.map(([phase, weeks], index) => (
                  <li
                    key={phase}
                    className="flex items-center justify-between gap-3 border-b border-white/5 py-2.5 last:border-0"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="font-mono text-[0.62rem] text-indigo-300/70">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-medium text-slate-100">{phase}</span>
                    </span>
                    <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-slate-400">
                      {weeks}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-300/80" aria-hidden="true" />
                Verified credential
              </span>
              <span className="text-indigo-200/90">Public review rubric</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- 2. Shift */

export function HomeShift() {
  return (
    <SectionShell>
      <div className="mx-auto max-w-4xl">
        <MonoLabel>The shift</MonoLabel>
        <h2 className="mt-5 text-balance text-3xl font-semibold leading-tight text-white md:text-4xl">
          Most professionals are using AI. Few can lead its adoption.
        </h2>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-400">
          Using AI is typing a prompt and hoping. Leading adoption is knowing where AI creates
          value in your field, where it becomes a liability, and how to run the work so it holds
          up to review.
        </p>
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------------ 3. Eight assets */

const ASSETS: Array<[string, string]> = [
  ["Personal AI Strategy Brief", "Your stance, scope, and adoption thesis."],
  ["AI Use-Case Portfolio", "Where AI earns its place in your work."],
  ["Interaction & Decision Kit", "Prompts, checks, and human-in-the-loop rules."],
  ["Grounded Domain Knowledge Pack", "The trusted sources your AI work stands on."],
  ["AI Evaluation Rubric & Test Set", "How you measure whether it actually works."],
  ["Custom Assistants & AI Workflows", "The working system, not a demo."],
  ["AI Value & Economics Case", "The evidence that it is worth doing."],
  ["Final Portfolio & 100-Day Roadmap", "What you ship next, and how you lead it."],
];

export function HomeAssets() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>What you build</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Eight assets. One defensible dossier.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          Each asset covers part of responsible adoption: where AI belongs, how risk and governance
          are handled, how value is evaluated, and how the work stays valid over time. Together they
          become one dossier you can defend.
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
    </SectionShell>
  );
}

/* ------------------------------------------------------------- 4. The method */

const METHOD: Array<[string, string, string]> = [
  ["Frame", "Where does AI actually belong in my work?", "Weeks 1-4"],
  ["Design", "How do I build it responsibly?", "Weeks 5-8"],
  ["Prove", "Can I show the value with evidence?", "Weeks 9-10"],
  ["Foresee", "How do I lead what comes next?", "Weeks 11-12"],
];

export function HomeMethod() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>The TenX Method</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Frame. Design. Prove. Foresee.
        </h2>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {METHOD.map(([phase, question, weeks], index) => (
          <div
            key={phase}
            className="flex flex-col rounded-xl border border-white/10 bg-[#0B1120] p-6"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-indigo-300/70">
                {String(index + 1).padStart(2, "0")} / 04
              </span>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-500">
                {weeks}
              </span>
            </div>
            <h3 className="mt-6 text-xl font-semibold text-white">{phase}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{question}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------ 5. Sample dossier proof */

export function HomeSampleProof() {
  return (
    <SectionShell>
      <div className="grid gap-10 md:grid-cols-[0.82fr_1.18fr] md:items-center">
        <a
          href={SAMPLE_PDF_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Preview a sample dossier (opens PDF in a new tab)"
          className="group block justify-self-center rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#070B14]"
        >
          <img
            src={SAMPLE_COVER_URL}
            alt={SAMPLE_COVER_ALT}
            width={1680}
            height={2376}
            loading="lazy"
            className="h-auto w-full max-w-[300px] rounded-lg border border-white/10 shadow-2xl shadow-black/40 transition group-hover:shadow-indigo-500/10"
          />
        </a>
        <div>
          <MonoLabel>Proof asset</MonoLabel>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
            See what reviewed work looks like.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-400">
            Preview an illustrative Living AI Solution Dossier, the artifact at the center of
            TenXPros. It shows the structure, reviewer notes, evidence gaps, and review standard
            behind the credential.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink
              href={SAMPLE_PDF_URL}
              size="lg"
              className={PRIMARY_CTA}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              Preview a sample dossier
            </ButtonLink>
            <ButtonLink
              href={SAMPLE_HTML_URL}
              size="lg"
              variant="secondary"
              className={SECONDARY_CTA}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open HTML preview
              <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
          <p className="mt-6 max-w-xl text-xs leading-5 text-slate-500">{SAMPLE_DISCLAIMER}</p>
        </div>
      </div>
    </SectionShell>
  );
}

/* ----------------------------------------------------------- 6. For / not for */

const FOR_LIST = [
  "Experienced professionals and senior operators",
  "Consultants, advisors, and freelancers",
  "Managers, team leads, and decision-makers",
  "Startup founders, entrepreneurs, and SMB owners",
  "Researchers, educators, and knowledge workers",
];

const BEST_FIT = [
  "You bring real expertise and judgment in your field",
  "You want to lead AI adoption, not just use AI tools",
  "You can commit a few focused hours each week",
  "You want reviewed, defensible work you can show",
];

export function HomeAudience() {
  return (
    <SectionShell>
      <div className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-2">
        <div className="bg-[#0B1120] p-8 md:p-10">
          <MonoLabel>Who it is for</MonoLabel>
          <ul className="mt-6 space-y-4">
            {FOR_LIST.map((item) => (
              <li key={item} className="flex gap-3 text-slate-100">
                <Check
                  className="mt-0.5 h-5 w-5 flex-none text-indigo-400"
                  aria-hidden="true"
                />
                <span className="leading-6">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-[#0B1120] p-8 md:p-10">
          <MonoLabel className="text-indigo-300/80">It works best when</MonoLabel>
          <ul className="mt-6 space-y-4">
            {BEST_FIT.map((item) => (
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

/* ------------------------------------------------- 7. Certification standard */

const OUTCOMES: Array<[string, string]> = [
  ["Certified", "The work meets the review standard and earns the credential."],
  ["Strong draft", "Close, specific revisions are returned before certification."],
  ["Completed", "The program is finished; the credential is not yet earned."],
];

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

export function HomeCertification() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel className="text-[#C9A961]/80">Review standard · Certification</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Reviewed work, not attendance.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          The credential is earned by submitting a dossier that meets an explicit review
          standard, not by finishing lessons or showing up.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {OUTCOMES.map(([title, desc], index) => {
          const isCertified = index === 0;
          return (
            <div
              key={title}
              className={cn(
                "rounded-xl border bg-[#0B1120] p-6",
                isCertified
                  ? "border-[#C9A961]/40 ring-1 ring-[#C9A961]/15"
                  : "border-white/10",
              )}
            >
              <div className="flex items-center gap-2">
                {isCertified ? (
                  <ShieldCheck className="h-4 w-4 text-[#C9A961]" aria-hidden="true" />
                ) : null}
                <h3
                  className={cn(
                    "text-lg font-semibold",
                    isCertified ? "text-[#C9A961]" : "text-white",
                  )}
                >
                  {title}
                </h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{desc}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-xl border border-[#C9A961]/25 bg-[#0B1120] p-8 ring-1 ring-[#C9A961]/10">
        <MonoLabel className="text-[#C9A961]/80">The eight review criteria</MonoLabel>
        <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {CRITERIA.map((item, index) => (
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
    </SectionShell>
  );
}

/* ------------------------------------------------------ 8. Founder credibility */

export function HomeFounderBand() {
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-14 md:px-8">
        <div className="flex flex-col gap-5 rounded-xl border border-white/10 bg-[#0B1120] p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <span
            className="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/10"
            aria-hidden="true"
          >
            <Award className="h-5 w-5 text-indigo-300" />
          </span>
          <div className="space-y-1.5">
            <MonoLabel className="text-slate-400">Designed by</MonoLabel>
            <p className="text-[0.95rem] leading-7 text-slate-300">
              <span className="font-medium text-white">Mehrdad Naderi</span>. The credential rests
              on the public standard: the sample dossier, eight review criteria, review outcomes,
              and verification.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------- 9. Founding Charter CTA */

export function HomeFinalCta() {
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
            Bring your expertise. Leave with reviewed evidence.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
            The Founding Charter is open during a limited founding review-capacity window. You apply
            with your expertise and the challenges you want to explore; payment happens only after
            acceptance.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/apply" size="lg" className={PRIMARY_CTA}>
              Apply for Founding Charter
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink
              href="/pricing"
              size="lg"
              variant="secondary"
              className={SECONDARY_CTA}
            >
              View pricing
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
