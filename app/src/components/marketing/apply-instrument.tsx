import { ArrowRight, Check, FileText, Minus, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Apply — "The Instrument" direction
 * --------------------------------------------------------------------------
 * Marketing-only, presentational server components for the public Apply page.
 * Shares the Home / Dossier / Pricing Instrument language: near-black base,
 * cool indigo action accent, gold reserved for review/credential moments,
 * hairline rules, monospace metadata.
 *
 * IMPORTANT: these components are the page *experience* only. The actual
 * application form (ApplicationForm), its zod schema/validation, and the
 * submitApplication server action are rendered by the route and are NOT
 * modified here. `ApplyFormShell` is a visual wrapper that places the existing
 * form on the page and exposes the #application-form anchor target.
 */

const FORM_ANCHOR = "#application-form";

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

const HERO_TRUST = ["No payment details required", "Reviewed application", "Pay only after acceptance"];

const APPLICATION_PATH: Array<[string, string]> = [
  ["Application received", "Your problem brief and context."],
  ["Fit review", "We read for a real problem and real commitment."],
  ["Payment link — after acceptance", "Sent only if you are accepted."],
  ["Onboarding & diagnostic", "You begin once payment is complete."],
];

export function ApplyHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-indigo-600/20 blur-[140px]"
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:px-8 md:py-28 lg:gap-16">
        <div className="flex flex-col justify-center">
          <MonoLabel>Founding Charter application</MonoLabel>
          <h1 className="mt-6 text-[2.15rem] font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl">
            Apply with one real professional problem.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:mt-6 sm:text-lg">
            TenXPros is selective because the work is reviewed. Apply with a serious problem from
            your field; if accepted, you receive the payment link and begin onboarding.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={FORM_ANCHOR} size="lg" className={PRIMARY_CTA}>
              Start application
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

        {/* Application path readout — process, not a guarantee */}
        <div className="flex items-center">
          <div className="w-full rounded-2xl border border-white/10 bg-[#0B1120] p-6 shadow-2xl shadow-black/40 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <MonoLabel className="text-slate-300">Application path</MonoLabel>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-indigo-200">
                Founding Charter
              </span>
            </div>
            <ol className="pt-2">
              {APPLICATION_PATH.map(([title, desc], index) => {
                const payment = index === 2;
                return (
                  <li
                    key={title}
                    className="flex gap-4 border-b border-white/5 py-3.5 last:border-0"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border font-mono text-[0.62rem]",
                        payment
                          ? "border-indigo-400/50 bg-indigo-500/15 text-indigo-200"
                          : "border-white/15 text-slate-400",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className={cn("block text-sm font-medium", payment ? "text-indigo-100" : "text-slate-100")}>
                        {title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-400">{desc}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-300/80" aria-hidden="true" />
              No payment before acceptance
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------- 2. Strong applications */

const STRONG = [
  ["A real professional problem", "Something from your actual work — not a hypothetical exercise."],
  ["A clear field / context", "The domain and constraints the problem lives in."],
  ["A human decision or workflow affected by AI", "Where judgment, not just output, is at stake."],
  ["Permission to work with safe, non-confidential examples", "Redacted or fictionalized material you are allowed to use."],
];

export function ApplyStrong() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>What a strong application brings</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Strong applications are specific.
        </h2>
      </div>
      <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2">
        {STRONG.map(([title, desc], index) => (
          <li key={title} className="flex flex-col bg-[#0B1120] p-6">
            <span className="font-mono text-xs text-indigo-300">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="mt-3 text-base font-semibold leading-snug text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-3xl text-sm leading-6 text-slate-400">
        You do not need to be technical. You do need to bring judgment, context, and a serious
        problem.
      </p>
    </SectionShell>
  );
}

/* ------------------------------------------------- 3. What happens after */

const AFTER_STEPS: Array<[string, string]> = [
  ["You submit the application", "One real problem, your field, and a little about you."],
  ["We review fit and seriousness", "A human read — not an automated decision."],
  ["If accepted, you receive the payment link", "Acceptance comes first; the Stripe link follows."],
  ["You complete onboarding and begin the diagnostic", "Payment first, then onboarding and your diagnostic."],
];

export function ApplyAfter() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>After you apply</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          What happens after you apply.
        </h2>
      </div>
      <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {AFTER_STEPS.map(([title, desc], index) => (
          <li key={title} className="flex flex-col rounded-xl border border-white/10 bg-[#0B1120] p-6">
            <span className="font-mono text-xs text-indigo-300">{String(index + 1).padStart(2, "0")} / 04</span>
            <h3 className="mt-4 text-base font-semibold leading-snug text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0B1120] p-5">
        <ShieldCheck className="h-5 w-5 flex-none text-indigo-300" aria-hidden="true" />
        <p className="text-sm leading-6 text-slate-200">No payment is requested before acceptance.</p>
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------- 4. Form section (visual wrapper) */

export function ApplyFormShell({ children }: { children: React.ReactNode }) {
  return (
    <section id="application-form" className="scroll-mt-24 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-28">
        <div className="mx-auto max-w-3xl">
          <MonoLabel>The application</MonoLabel>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
            Start your Founding Charter application.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-300">
            Use this form to explain the professional problem you want to carry through the 12-week
            program. The more specific your problem, the easier it is to assess fit.
          </p>
          <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-500">
            No payment details required · Pay only after acceptance
          </p>

          {/* Static pre-form block — server-rendered, visible before the form hydrates */}
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#0B1120] p-6">
              <MonoLabel>Before you apply</MonoLabel>
              <ul className="mt-4 space-y-2.5 text-sm leading-6 text-slate-300">
                {[
                  "Takes about 7–10 minutes.",
                  "No payment details are required.",
                  "Do not include confidential client, employer, patient, or regulated data — use redacted or fictionalized examples.",
                  "If accepted, payment confirms enrollment; then onboarding and the diagnostic begin.",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-indigo-400" aria-hidden="true" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                If the form does not load, refresh the page and try again. If it still fails, email{" "}
                <a
                  href="mailto:hello@tenxpros.com"
                  className="text-indigo-300 underline-offset-2 hover:underline"
                >
                  hello@tenxpros.com
                </a>
                .
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0B1120] p-6">
              <MonoLabel className="text-slate-400">What the form will ask</MonoLabel>
              <ul className="mt-4 grid gap-2.5 text-sm leading-6 text-slate-200">
                {[
                  "Your professional role and field",
                  "Your AI experience",
                  "Your weekly time availability",
                  "Why TenXPros fits your context now",
                  "The one real professional problem you want to carry through the program",
                  "Confidentiality and terms consent",
                ].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="font-mono text-xs text-indigo-300/70">{String(i + 1).padStart(2, "0")}</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Existing ApplicationForm (its own white card surface) — unmodified */}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------- 5. Before you submit */

const REASSURE: Array<[string, string]> = [
  ["You are not paying now", "Applying is free and creates no payment obligation."],
  ["You do not need to be technical", "Bring judgment and context; no coding required."],
  ["Do not include confidential client data", "Keep regulated or third-party data out of the form."],
  ["You can use redacted or fictionalized examples", "Safe, non-confidential material is enough to assess fit."],
  ["If the fit is not right, you pay nothing", "No acceptance means no charge, no obligation."],
];

export function ApplyReassure() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>Before you submit</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Before you submit.
        </h2>
      </div>
      <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {REASSURE.map(([title, desc]) => (
          <li key={title} className="flex gap-3 bg-[#0B1120] p-6">
            <Check className="mt-0.5 h-5 w-5 flex-none text-indigo-400" aria-hidden="true" />
            <div>
              <h3 className="text-[0.95rem] font-semibold leading-snug text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-300">{desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

/* ------------------------------------------------------------- 6. Proof block */

export function ApplyProof() {
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
          <MonoLabel>Proof before you apply</MonoLabel>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
            See the standard before you apply.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
            The credential is earned against a public review standard. Read an illustrative Living
            AI Solution Dossier — the 12-section structure, reviewer notes, an intentional evidence
            gap, and how the work maps to the rubric — before you commit anything.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
            <SampleThumb src={SAMPLE_SNAPSHOT_URL} label="Executive Snapshot" />
            <SampleThumb src={SAMPLE_ASSETS_URL} label="Eight Assets & Rubric" />
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href={SAMPLE_PDF_URL} size="lg" className={PRIMARY_CTA} target="_blank" rel="noopener noreferrer">
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              Preview sample dossier
            </ButtonLink>
            <ButtonLink href={SAMPLE_HTML_URL} size="lg" variant="secondary" className={SECONDARY_CTA} target="_blank" rel="noopener noreferrer">
              Open HTML preview
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

/* --------------------------------------------------- 7. Who should apply */

const GOOD_FIT = [
  "Experienced professionals with a real work problem",
  "Consultants, advisors, and freelancers building AI-enabled services",
  "Managers and team leads responsible for adoption decisions",
  "Researchers, educators, and knowledge workers redesigning knowledge work",
];

const NOT_FIT = [
  "People who only want prompt tricks",
  "People who want a certificate for watching videos",
  "People who cannot bring a real problem",
  "People looking for guaranteed job or income outcomes",
  "People planning to paste confidential data into tools",
];

export function ApplyAudience() {
  return (
    <SectionShell>
      <div className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-2">
        <div className="bg-[#0B1120] p-8 md:p-10">
          <MonoLabel>Good fit</MonoLabel>
          <ul className="mt-6 space-y-4">
            {GOOD_FIT.map((item) => (
              <li key={item} className="flex gap-3 text-slate-100">
                <Check className="mt-0.5 h-5 w-5 flex-none text-indigo-400" aria-hidden="true" />
                <span className="leading-6">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-[#0B1120] p-8 md:p-10">
          <MonoLabel className="text-slate-400">Not a fit</MonoLabel>
          <ul className="mt-6 space-y-4">
            {NOT_FIT.map((item) => (
              <li key={item} className="flex gap-3 text-slate-400">
                <Minus className="mt-0.5 h-5 w-5 flex-none text-slate-500" aria-hidden="true" />
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

export function ApplyFinalCta() {
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
            Ready to apply?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            Bring the problem. We will bring the method. Payment happens only after acceptance.
          </p>
          <div className="mt-9 flex justify-center">
            <ButtonLink href={FORM_ANCHOR} size="lg" className={PRIMARY_CTA}>
              Start application
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
