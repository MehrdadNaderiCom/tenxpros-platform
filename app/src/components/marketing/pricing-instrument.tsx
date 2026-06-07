import { ArrowRight, ArrowUpRight, Check, FileText, Minus, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Pricing — "The Instrument" direction
 * --------------------------------------------------------------------------
 * Marketing-only, presentational server components for the public Pricing
 * page. Shares the Home / Dossier Instrument language: near-black base, cool
 * indigo action accent, gold reserved for credential / charter-seal moments,
 * hairline rules, monospace metadata.
 *
 * Renders static content and links only — no app logic, server actions, auth,
 * database, or application/payment flows. Payment timing is described, not
 * implemented; the CTA links to the existing /apply route. Sample-dossier
 * assets are reused from /public/samples (the same files SampleDossierPreview
 * links to); nothing about those assets is modified.
 */

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

const HERO_TRUST = ["$0 before acceptance", "Reviewed application", "Limited founding seats"];

export function PricingHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-indigo-600/20 blur-[140px]"
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:px-8 md:py-28 lg:gap-16">
        <div className="flex flex-col justify-center">
          <MonoLabel>Founding Charter</MonoLabel>
          <h1 className="mt-6 text-[2.15rem] font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl">
            Apply first. Pay only after acceptance.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:mt-6 sm:text-lg">
            The Founding Charter is open during a limited founding review-capacity window. You apply
            with one real professional problem; payment happens only if you are accepted.
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

        {/* Price instrument readout — headline number + status, not the full card */}
        <div className="flex items-center">
          <div className="w-full rounded-2xl border border-white/10 bg-[#0B1120] p-6 shadow-2xl shadow-black/40 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <MonoLabel className="text-slate-300">Founding Charter</MonoLabel>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-indigo-200">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-300" aria-hidden="true" />
                Open now
              </span>
            </div>
            <div className="flex items-end gap-3 pt-6">
              <span className="text-5xl font-semibold tracking-tight text-white">$997 USD</span>
              <span className="pb-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-500">
                one-time · first cohort
              </span>
            </div>
            <ul className="mt-6 space-y-px">
              {[
                ["Review capacity", "Limited founding window"],
                ["Before acceptance", "$0"],
                ["Payment", "Only after acceptance"],
              ].map(([k, v]) => (
                <li
                  key={k}
                  className="flex items-center justify-between gap-3 border-b border-white/5 py-2.5 last:border-0"
                >
                  <span className="text-sm text-slate-400">{k}</span>
                  <span className="text-sm font-medium text-slate-100">{v}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-400">
              <span>Lowest founding entry</span>
              <span className="text-indigo-200/90">Apply to be considered for a seat</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- 2. Current tier card */

const FOUNDING_INCLUDES = [
  "12-week guided program",
  "Diagnostic + personalized path",
  "The TenX Method (Frame · Design · Prove · Foresee)",
  "8 connected assets",
  "Living AI Solution Dossier",
  "Section-level review",
  "Capstone defense / final review",
  "Verifiable credential",
  "90-day adoption roadmap",
  "Pay only after acceptance",
];

export function PricingCard() {
  return (
    <SectionShell>
      <div className="mx-auto max-w-3xl">
        <div className="relative overflow-hidden rounded-2xl border border-indigo-400/30 bg-[#0B1120] p-7 shadow-2xl shadow-black/40 ring-1 ring-indigo-400/10 md:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-0 h-[260px] w-[260px] rounded-full bg-indigo-600/15 blur-[120px]"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MonoLabel className="text-indigo-300">Founding Charter</MonoLabel>
              {/* restrained gold charter seal */}
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-[0.16em]"
                style={{ borderColor: `${GOLD}55`, color: GOLD }}
              >
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                Charter 01
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-indigo-200">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-300" aria-hidden="true" />
              Open now
            </span>
          </div>

          <div className="relative mt-6 flex flex-wrap items-end gap-x-4 gap-y-1">
            <span className="text-6xl font-semibold tracking-tight text-white">$997 USD</span>
            <span className="pb-2 text-sm text-slate-400">Limited founding review-capacity window</span>
          </div>
          <p className="relative mt-3 max-w-xl text-sm leading-6 text-slate-400">
            The founding window is limited because dossier review is manual and capacity is
            intentionally constrained — not as a pressure tactic.
          </p>

          <ul className="relative mt-8 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {FOUNDING_INCLUDES.map((item) => (
              <li key={item} className="flex items-start gap-3 text-slate-200">
                <Check className="mt-0.5 h-4 w-4 flex-none text-indigo-400" aria-hidden="true" />
                <span className="text-[0.95rem] leading-6">{item}</span>
              </li>
            ))}
          </ul>

          <div className="relative mt-9">
            <ButtonLink href="/apply" size="lg" className={cn("w-full", PRIMARY_CTA)}>
              Apply for Founding Charter
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <p className="mt-4 text-center font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-500">
              Pay only after acceptance · No payment details required to apply
            </p>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

/* ----------------------------------------------------------- 3. Pricing ladder */

const LADDER: Array<{ name: string; price: string; status: string; desc: string; open?: boolean }> = [
  { name: "Founding Charter", price: "$997 USD", status: "Open now", desc: "Open while founding review capacity remains.", open: true },
  { name: "Early Charter", price: "$1,247 USD", status: "Preview", desc: "Opens after Founding Charter closes." },
  { name: "Late Charter", price: "$1,497 USD", status: "Preview", desc: "Opens after Early Charter closes." },
  { name: "Final Charter", price: "$1,747 USD", status: "Preview", desc: "Opens after Late Charter closes." },
  { name: "Standard", price: "$1,997 USD", status: "Preview", desc: "Ongoing entry point after charter windows." },
];

export function PricingLadder() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>The charter ladder</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          One program. A rising entry point.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          The price increases as the founding window closes. The program structure remains the
          same; the Founding Charter is the lowest available entry point for the first cohort.
        </p>
      </div>

      <ul className="mt-12 overflow-hidden rounded-xl border border-white/10">
        {LADDER.map(({ name, price, status, desc, open }, index) => (
          <li
            key={name}
            className={cn(
              "flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-white/10 px-5 py-5 last:border-0 sm:px-7",
              open ? "bg-indigo-500/[0.07]" : "bg-[#0B1120]",
            )}
          >
            <div className="flex items-start gap-4">
              <span className="mt-0.5 font-mono text-xs tabular-nums text-indigo-300/70">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <span className={cn("block text-base font-semibold", open ? "text-white" : "text-slate-200")}>
                  {name}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">{desc}</span>
              </span>
            </div>
            <div className="flex items-center gap-5">
              <span className={cn("text-lg font-semibold tabular-nums", open ? "text-white" : "text-slate-300")}>
                {price}
              </span>
              {open ? (
                <span className="inline-flex w-24 justify-center rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-indigo-200">
                  {status}
                </span>
              ) : (
                <span className="inline-flex w-24 justify-center rounded-full border border-white/10 px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-slate-500">
                  {status}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
        The program structure stays the same; the entry price changes by charter window. No
        countdowns and no pressure mechanics — the Founding Charter simply stays open while founding
        review capacity remains.
      </p>
    </SectionShell>
  );
}

/* ------------------------------------------------------- 4. What you pay for */

const VALUE_STACK: Array<[string, string]> = [
  ["A reviewed professional asset", "Not watched lessons — a dossier reviewed against explicit criteria."],
  ["One real problem from your field", "You bring the work; the program makes it defensible."],
  ["Guided 12-week method", "Frame · Design · Prove · Foresee, with coaching checkpoints."],
  ["Dossier review against criteria", "Eight explicit review criteria, applied to your work."],
  ["Sample dossier and public rubric", "You see the standard before you apply."],
  ["Verifiable credential infrastructure", "A credential backed by reviewed evidence, not attendance."],
  ["90-day adoption roadmap", "What you ship next, and how you lead it after the program."],
];

export function PricingValue() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>What you pay for</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          What your Founding Charter builds.
        </h2>
      </div>
      <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {VALUE_STACK.map(([title, desc], index) => (
          <li key={title} className="flex flex-col bg-[#0B1120] p-6">
            <span className="font-mono text-xs text-indigo-300">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="mt-3 text-base font-semibold leading-snug text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-3xl text-sm leading-6 text-slate-400">
        Professionals use the dossier to explain AI adoption decisions to clients, leadership, and
        teams — not as a promise of outcomes, but as reviewed work they can stand behind when asked
        how they evaluated the problem, risks, workflow, and evidence.
      </p>
    </SectionShell>
  );
}

/* --------------------------------------------------------- 5. Different by design */

const COMPARE_COLUMNS = [
  { key: "tools", label: "Generic AI tools course", highlight: false },
  { key: "uni", label: "University executive AI program", highlight: false },
  { key: "tenx", label: "TenXPros", highlight: true },
] as const;

const COMPARE_ROWS: Array<{ label: string; tools: string; uni: string; tenx: string }> = [
  { label: "Typical price", tools: "Free – ~$500", uni: "Often many thousands, depending on provider and format", tenx: "$997 (Founding Charter)" },
  { label: "Main focus", tools: "Features and prompts", uni: "Institutional strategy & networks", tenx: "One real problem, made defensible" },
  { label: "Personalization", tools: "Generic, one-size-fits-all", uni: "Cohort case method", tenx: "Your role, domain, and problem" },
  { label: "Output", tools: "Completion certificate", uni: "Executive certificate", tenx: "Reviewed Living AI Solution Dossier" },
  { label: "Review standard", tools: "None", uni: "Varies by program", tenx: "Explicit 8-criteria review" },
  { label: "Credential meaning", tools: "You attended", uni: "You completed a program", tenx: "You produced reviewed evidence" },
  { label: "Best fit", tools: "Quick tactics", uni: "Institutional perspective", tenx: "Experienced pros leading AI adoption" },
];

export function PricingCompare() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>Different by design</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Different by design — not a replacement for university executive education.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          Universities are strongest for institutional perspective. Tools courses are useful for
          quick tactics. TenXPros is built for one thing: helping experienced professionals turn
          one real problem into reviewed AI adoption work they can defend.
        </p>
      </div>

      {/* Desktop table */}
      <div className="mt-12 hidden overflow-hidden rounded-xl border border-white/10 lg:block">
        <div className="grid grid-cols-[180px_1fr_1fr_1fr]">
          <div className="bg-[#0B1120] p-4" />
          {COMPARE_COLUMNS.map((c) => (
            <div
              key={c.key}
              className={cn(
                "p-4 font-mono text-[0.62rem] uppercase tracking-[0.16em]",
                c.highlight ? "bg-indigo-500/10 text-indigo-200" : "bg-[#0B1120] text-slate-400",
              )}
            >
              {c.label}
            </div>
          ))}
          {COMPARE_ROWS.map((row) => (
            <div key={row.label} className="contents">
              <div className="border-t border-white/10 bg-[#0B1120] p-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                {row.label}
              </div>
              <div className="border-t border-white/10 bg-[#0B1120] p-4 text-sm text-slate-400">{row.tools}</div>
              <div className="border-t border-white/10 bg-[#0B1120] p-4 text-sm text-slate-400">{row.uni}</div>
              <div className="border-t border-white/10 bg-indigo-500/[0.07] p-4 text-sm font-medium text-slate-100">
                {row.tenx}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: one card per column (no horizontal scroll) */}
      <div className="mt-12 grid gap-4 lg:hidden">
        {COMPARE_COLUMNS.map((c) => (
          <div
            key={c.key}
            className={cn(
              "rounded-xl border bg-[#0B1120] p-6",
              c.highlight ? "border-indigo-400/30 ring-1 ring-indigo-400/10" : "border-white/10",
            )}
          >
            <p
              className={cn(
                "font-mono text-[0.62rem] uppercase tracking-[0.16em]",
                c.highlight ? "text-indigo-200" : "text-slate-400",
              )}
            >
              {c.label}
            </p>
            <dl className="mt-4 space-y-3">
              {COMPARE_ROWS.map((row) => (
                <div key={row.label} className="flex justify-between gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">{row.label}</dt>
                  <dd className={cn("text-right text-sm", c.highlight ? "font-medium text-slate-100" : "text-slate-300")}>
                    {row[c.key]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------ 6. Proof before payment */

export function PricingProof() {
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
          <MonoLabel>Proof before payment</MonoLabel>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
            See the artifact before you apply.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
            You can read an illustrative Living AI Solution Dossier before spending anything. It
            shows the 12-section structure, reviewer notes, an intentional evidence gap, and how
            the work maps to the public review rubric.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
            <SampleThumb src={SAMPLE_SNAPSHOT_URL} label="Executive Snapshot" />
            <SampleThumb src={SAMPLE_ASSETS_URL} label="Eight Assets & Rubric" />
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href={SAMPLE_HTML_URL} size="lg" className={PRIMARY_CTA} target="_blank" rel="noopener noreferrer">
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              Preview in browser
              <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
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

/* --------------------------------------------------------- 7. How payment works */

const STEPS: Array<[string, string]> = [
  ["Apply with one real problem", "Tell us the professional problem you would carry through the program."],
  ["We review fit and seriousness", "A reviewed application — we look for a real problem and real commitment."],
  ["If accepted, you receive the payment link", "Acceptance comes first; only then do we send a Stripe payment link."],
  ["You pay, then begin onboarding", "Payment happens only after acceptance, and onboarding starts right after."],
];

export function PricingPayment() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>How payment works</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          How payment works.
        </h2>
      </div>
      <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(([title, desc], index) => (
          <li key={title} className="flex flex-col rounded-xl border border-white/10 bg-[#0B1120] p-6">
            <span className="font-mono text-xs text-indigo-300">{String(index + 1).padStart(2, "0")} / 04</span>
            <h3 className="mt-4 text-base font-semibold leading-snug text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0B1120] p-5">
        <ShieldCheck className="h-5 w-5 flex-none text-indigo-300" aria-hidden="true" />
        <p className="text-sm leading-6 text-slate-200">No payment details are required to apply.</p>
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------------------- 8. FAQ */

const FAQS: Array<[string, string]> = [
  ["Why do I need to apply?", "TenXPros is selective. Applying keeps the cohort serious — we accept people with a real problem and the commitment to do reviewed work."],
  ["Why is payment after acceptance?", "You should only pay once we have confirmed fit. Applying creates no payment obligation, and no payment details are required to apply."],
  ["Is this a university certificate?", "No. It is a private certification earned through reviewed work — not a university degree or an accredited academic program."],
  ["Is the credential recognized?", "It is a verifiable credential backed by a public review rubric and a reviewed dossier. Its weight comes from the evidence behind it, not from an accreditation body."],
  ["What if I am not accepted?", "You pay nothing. Where we can, we explain the fit gap and point you toward a more suitable next step."],
  ["What if I cannot finish in 12 weeks?", "The 12 weeks are guided, but the dossier is the goal. We work with you on reasonable timing — certification is based on the work, not the clock."],
  ["Is this for non-technical professionals?", "Yes. It is built for experienced professionals across fields. You bring the expertise; we bring the AI method. No coding is required."],
  ["What exactly will I produce?", "A reviewed Living AI Solution Dossier — eight connected assets covering one real problem, from framing to a 90-day roadmap."],
  ["Can I expense this through my company?", "Many participants do. We provide an itemized receipt after payment; check your employer's professional-development policy."],
  ["I'm applying from outside the US — anything I should know?", "Prices are listed in USD, and payment is requested only after acceptance. The path is designed to be async-friendly for international professionals, and the review language is English unless otherwise stated. You can request an invoice or receipt after acceptance and payment. As always, do not submit confidential or regulated data — use redacted or fictionalized examples."],
  ["Is my data safe?", "You control what you bring, and the program emphasizes confidentiality and governance. The public sample dossier uses fictional data only."],
];

export function PricingFaq() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>Questions</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Honest answers before you apply.
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

/* --------------------------------------------------------------- 9. Final CTA */

export function PricingFinalCta() {
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
            Bring one real problem. Leave with reviewed evidence.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            Apply for the Founding Charter with a serious professional problem. Payment happens
            only after acceptance.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
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
        </div>
      </div>
    </section>
  );
}
