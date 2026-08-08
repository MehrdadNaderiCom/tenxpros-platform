import { ArrowRight, Check, FileText, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { modules } from "@/lib/program-data";
import { cn } from "@/lib/utils";

/**
 * Program / Method, "The Instrument" direction
 * --------------------------------------------------------------------------
 * Marketing-only, presentational server components for the public Program /
 * Method page. Shares the Home / Dossier / Pricing / Apply / Certification
 * Instrument language: near-black base, cool indigo action accent, gold
 * reserved for review / credential / seal moments, hairline rules, monospace
 * metadata.
 *
 * The module path is rendered from the CANONICAL `modules` data in
 * program-data.ts (read-only). This file changes no app logic, server actions,
 * auth, database, or participant module/progression logic, and does not modify
 * the canonical data. Sample-dossier assets are reused from /public/samples.
 */

const SAMPLE_PDF_URL = "/samples/tenxpros-sample-dossier-excerpt.pdf";
const SAMPLE_HTML_URL = "/samples/tenxpros-sample-dossier-excerpt.html";
const SAMPLE_COVER_URL = "/samples/tenxpros-sample-dossier-cover.png";
const SAMPLE_COVER_ALT =
  "Illustrative TenXPros Living AI Solution Dossier cover for fictional participant Maya R.";
const SAMPLE_DISCLAIMER =
  "Illustrative sample. Fictional participant. No real client data. Review labels are illustrative, not a certification decision.";

const PRIMARY_CTA =
  "whitespace-nowrap bg-indigo-500 text-white hover:bg-indigo-400 focus:ring-indigo-400 focus:ring-offset-[#070B14]";
const SECONDARY_CTA =
  "whitespace-nowrap border-white/20 bg-transparent text-slate-100 hover:bg-white/5 focus:ring-indigo-400 focus:ring-offset-[#070B14]";

const GOLD = "#C9A961";

// Phase metadata. Week ranges follow the Instrument convention used across the
// rebuilt pages; module→phase membership comes from the canonical data.
const PHASES: Array<{ key: "FRAME" | "DESIGN" | "PROVE" | "FORESEE"; label: string; weeks: string; blurb: string }> = [
  { key: "FRAME", label: "Frame", weeks: "Weeks 1-4", blurb: "Define the problem, context, boundaries, and AI fit." },
  { key: "DESIGN", label: "Design", weeks: "Weeks 5-8", blurb: "Build responsible workflows, knowledge packs, and guardrails." },
  { key: "PROVE", label: "Prove", weeks: "Weeks 9-10", blurb: "Test quality, usability, value, and risk." },
  { key: "FORESEE", label: "Foresee", weeks: "Weeks 11-12", blurb: "Create the roadmap and defend what comes next." },
];

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

const HERO_TRUST = ["100-day journey", "12 guided learning weeks", "1 reviewed dossier"];

export function ProgramHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-indigo-600/20 blur-[140px]"
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:px-8 md:py-28 lg:gap-16">
        <div className="flex flex-col justify-center">
          <MonoLabel>The TenX Method</MonoLabel>
          <h1 className="mt-6 text-[2.15rem] font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl">
            Frame. Design. Prove. Foresee.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:mt-6 sm:text-lg">
            A 100-day applied journey for experienced professionals, built around a 12-week guided
            learning path. Build practical AI judgment: find where AI belongs in your field, design
            responsibly, prove the value, and assemble a reviewed Living AI Solution Dossier.
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

        {/* Method instrument panel, four phases + dossier output */}
        <div className="flex items-center">
          <div className="w-full rounded-2xl border border-white/10 bg-[#0B1120] p-6 shadow-2xl shadow-black/40 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <MonoLabel className="text-slate-300">The TenX Method</MonoLabel>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-500">100 days</span>
            </div>
            <ul className="pt-2">
              {PHASES.map((p, index) => (
                <li key={p.key} className="flex items-center justify-between gap-4 border-b border-white/5 py-3 last:border-0">
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[0.62rem] text-indigo-300/70">{String(index + 1).padStart(2, "0")}</span>
                    <span className="text-sm font-medium text-slate-100">{p.label}</span>
                  </span>
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-slate-400">{p.weeks}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-300/80" aria-hidden="true" />
                Output
              </span>
              <span className="text-indigo-200/90">Living AI Solution Dossier</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------- 2. Why this method exists */

export function ProgramWhy() {
  return (
    <SectionShell>
      <div className="mx-auto max-w-4xl">
        <MonoLabel>Why this method exists</MonoLabel>
        <h2 className="mt-5 text-balance text-3xl font-semibold leading-tight text-white md:text-4xl">
          Using AI is easy. Leading adoption is harder.
        </h2>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
          Adoption is not a prompt. It means deciding where AI belongs in your work, where it
          creates risk, how humans stay accountable, and how value is proven. The TenX Method is a
          repeatable way to do that with a focused professional challenge, and to leave with evidence
          you can defend.
        </p>
      </div>
    </SectionShell>
  );
}

/* ----------------------------------------------------------- 3. Four phases */

const PHASE_DETAIL: Array<[string, string, string]> = [
  ["Frame", "Weeks 1-4", "Define the problem, context, boundaries, and AI fit."],
  ["Design", "Weeks 5-8", "Build responsible workflows, knowledge packs, and guardrails."],
  ["Prove", "Weeks 9-10", "Test quality, usability, value, and risk."],
  ["Foresee", "Weeks 11-12", "Create the roadmap and defend what comes next."],
];

export function ProgramPhases() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>Method overview</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          The four phases.
        </h2>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PHASE_DETAIL.map(([phase, weeks, blurb], index) => (
          <div key={phase} className="flex flex-col rounded-xl border border-white/10 bg-[#0B1120] p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-indigo-300/70">{String(index + 1).padStart(2, "0")} / 04</span>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-500">{weeks}</span>
            </div>
            <h3 className="mt-6 text-xl font-semibold text-white">{phase}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{blurb}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* --------------------------------------------------- 3b. Format & commitment */

const FORMAT: Array<[string, string]> = [
  ["Duration", "100-day journey"],
  ["Structure", "12 guided learning weeks · 11 core modules + final dossier & capstone review"],
  ["Built for", "Working professionals"],
  ["Weekly commitment", "Approximately 3-5 hours per week"],
  ["Format", "Async-first"],
  ["Checkpoints", "Tied to the dossier, not video attendance"],
];

export function ProgramFormat() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>Format &amp; commitment</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Built for working professionals.
        </h2>
      </div>
      <dl className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {FORMAT.map(([k, v]) => (
          <div key={k} className="bg-[#0B1120] p-6">
            <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-indigo-300/70">{k}</dt>
            <dd className="mt-2 text-[0.95rem] font-medium leading-6 text-slate-100">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 max-w-3xl text-sm leading-6 text-slate-400">
        You do not need to code. You do need professional judgment, because the work is reviewed
        against a real standard. Progress is measured by the dossier you build, not by hours of
        video watched.
      </p>
    </SectionShell>
  );
}

/* ------------------------------------------------- 4. The guided path (modules) */

export function ProgramModules() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>The guided path</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          The guided path.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          The 100-day journey is anchored by 12 guided learning weeks across 4 phases: 11 core
          modules plus a final dossier and capstone review. The early weeks build AI orientation and
          problem discovery; later weeks move into responsible design, proof, and foresight. Each
          module carries a guiding question and a milestone badge, and moves the dossier forward.
        </p>
      </div>

      <div className="mt-12 space-y-4">
        {PHASES.map(({ key, label, weeks, blurb }, phaseIndex) => {
          const phaseModules = modules.filter((m) => m.phase === key);
          return (
            <div
              key={key}
              className="grid gap-6 rounded-xl border border-white/10 bg-[#0B1120] p-6 md:grid-cols-[230px_1fr] md:gap-10 md:p-8"
            >
              <div className="md:border-r md:border-white/10 md:pr-8">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-indigo-300/70">
                  Phase {String(phaseIndex + 1).padStart(2, "0")} · {weeks}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{blurb}</p>
                <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-slate-500">
                  {phaseModules.length} {phaseModules.length === 1 ? "module" : "modules"}
                </p>
              </div>
              <ul className="divide-y divide-white/5">
                {phaseModules.map((m) => (
                  <li key={m.number} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <span className="mt-0.5 w-7 flex-none font-mono text-xs tabular-nums text-indigo-300/80">
                      {String(m.number).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-[0.95rem] font-semibold leading-snug text-white">{m.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{m.coreQuestion}</p>
                      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-0.5 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-slate-400">
                        <ShieldCheck className="h-3 w-3 text-indigo-300/70" aria-hidden="true" />
                        Milestone · {m.badgeName.replace(/\s*Badge$/i, "")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {/* Week 12, final dossier + capstone review (a gold review moment) */}
        <div className="flex flex-col gap-4 rounded-xl border border-[#C9A961]/30 bg-[#0B1120] p-6 ring-1 ring-[#C9A961]/10 sm:flex-row sm:items-center sm:gap-6 md:p-8">
          <span
            className="flex h-12 w-12 flex-none items-center justify-center rounded-full border"
            style={{ borderColor: `${GOLD}55` }}
            aria-hidden="true"
          >
            <ShieldCheck className="h-5 w-5" style={{ color: GOLD }} />
          </span>
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em]" style={{ color: `${GOLD}cc` }}>
              Week 12 · Final review
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">Final dossier &amp; capstone review</h3>
            <p className="mt-1.5 text-sm leading-6 text-slate-300">
              The eleven modules assemble into the Living AI Solution Dossier, which is reviewed
              against the public criteria, the capstone that earns the credential.
            </p>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------------ 5. Eight assets */

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

export function ProgramAssets() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>What you build</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Eight assets, one dossier.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          The weekly work is not busywork, each phase produces a connected asset. Assembled
          together, the eight assets become the reviewed Living AI Solution Dossier.
        </p>
      </div>
      <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {ASSETS.map(([title, desc], index) => (
          <li key={title} className="flex flex-col bg-[#0B1120] p-6 transition-colors hover:bg-[#0E1424]">
            <span className="font-mono text-xs text-indigo-300">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="mt-3 text-base font-semibold leading-snug text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0B1120] p-5">
        <FileText className="h-5 w-5 flex-none text-indigo-300" aria-hidden="true" />
        <p className="text-sm leading-6 text-slate-300">
          Assembled together, the eight assets form the reviewed Living AI Solution Dossier, the
          artifact at the center of the credential.
        </p>
      </div>
    </SectionShell>
  );
}

/* --------------------------------------------------- 6. Personalization */

const DIMENSIONS: Array<[string, string]> = [
  ["Field & context", "Your domain and the work the problem lives in."],
  ["Risk & sensitivity", "How exposed the work is, and what must stay protected."],
  ["Stakeholders", "Who is affected and who must trust the result."],
  ["Output type", "What the AI-enabled work needs to produce."],
  ["Evidence readiness", "What you can measure, and what you can safely use."],
  ["Time availability", "The pace you can realistically commit to."],
];

export function ProgramPersonalization() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>Personalization without chaos</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Field-specific, not improvised.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          The diagnostic shapes your path around your field, risk level, stakeholders, evidence,
          output type, and time, but the review standard stays the same for everyone. Personal,
          not random.
        </p>
      </div>
      <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {DIMENSIONS.map(([title, desc], index) => (
          <li key={title} className="flex flex-col bg-[#0B1120] p-6">
            <span className="font-mono text-xs text-indigo-300">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="mt-3 text-base font-semibold leading-snug text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

/* ------------------------------------------------------- 7. Review checkpoints */

const CHECKPOINTS: Array<[string, string, string]> = [
  ["Frame checkpoint", "Weeks 1-4", "Problem, boundaries, and AI fit are reviewable before you build."],
  ["Design checkpoint", "Weeks 5-8", "Workflow, knowledge pack, and guardrails take shape."],
  ["Prove checkpoint", "Weeks 9-10", "Evaluation, value evidence, and adoption plan are tested."],
  ["Final dossier checkpoint", "Weeks 11-12", "Foresight, roadmap, and the assembled dossier go to review."],
];

export function ProgramReview() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>Review checkpoints</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Every phase moves toward review.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          The dossier is not a last-minute assignment. It is assembled gradually through artifacts
          and checkpoints, so the final review confirms work you have already been doing.
        </p>
      </div>
      <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {CHECKPOINTS.map(([title, weeks, desc], index) => {
          const final = index === 3;
          return (
            <li
              key={title}
              className={cn(
                "flex flex-col rounded-xl border bg-[#0B1120] p-6",
                final ? "border-[#C9A961]/30 ring-1 ring-[#C9A961]/10" : "border-white/10",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("font-mono text-xs", final ? "" : "text-indigo-300")} style={final ? { color: GOLD } : undefined}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate-500">{weeks}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold leading-snug text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
            </li>
          );
        })}
      </ol>
    </SectionShell>
  );
}

/* ------------------------------------------------ 8. What makes the work defensible */

const DEFENSIBLE: Array<[string, string]> = [
  ["Starts from a real problem", "Work from your actual field and constraints, not a sandbox exercise."],
  ["Designs responsible AI use", "Explicit boundaries, governance, and the judgment that stays with a human."],
  ["Tests outputs against a rubric", "An evaluation rubric and a test set, not a claim that it simply works."],
  ["Documents risks and value", "Risk, ethics, and the value case written down where they can be reviewed."],
  ["Becomes reviewed evidence", "A dossier assessed against the eight public criteria, work you can stand behind."],
];

export function ProgramNotTools() {
  return (
    <SectionShell>
      <div className="max-w-3xl">
        <MonoLabel>What makes the work defensible</MonoLabel>
        <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
          Built to hold up to review.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          The difference is not which tools you touch, it is whether the work holds up when
          someone asks how you decided. Every phase of the TenX Method leaves evidence you can
          defend.
        </p>
      </div>
      <ul className="mt-12 overflow-hidden rounded-xl border border-white/10">
        {DEFENSIBLE.map(([title, desc], index) => (
          <li
            key={title}
            className="flex items-start gap-4 border-b border-white/10 bg-[#0B1120] px-5 py-5 last:border-0 sm:px-7"
          >
            <span className="mt-0.5 font-mono text-xs tabular-nums text-indigo-300">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="text-[0.95rem] font-semibold leading-snug text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-300">{desc}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-3xl text-sm leading-6 text-slate-400">
        TenXPros teaches a deeper level of AI use: how to discover the right problems, decide where
        AI genuinely belongs, design responsibly, and prove the value in your own field. The result
        is reviewed work an employer, client, or team can actually check.
      </p>
    </SectionShell>
  );
}

/* ----------------------------------------------------------------- 9. Proof */

export function ProgramProof() {
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
          <MonoLabel>Where the method leads</MonoLabel>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
            See where the method leads.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
            The sample dossier shows how the method turns a professional problem into a structured,
            reviewed artifact, the four phases, the eight assets, reviewer notes, and the rubric
            mapping, in one document.
          </p>
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

/* --------------------------------------------------------------- 10. Final CTA */

export function ProgramFinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-white/10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[140px]"
      />
      <div className="relative mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <MonoLabel>Founding Charter</MonoLabel>
          <h2 className="mt-5 text-balance text-3xl font-semibold leading-tight text-white md:text-4xl">
            Bring your expertise. We bring the AI method.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            Apply for the Founding Charter with your expertise and the challenges you want to
            explore. Payment happens only after acceptance.
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
