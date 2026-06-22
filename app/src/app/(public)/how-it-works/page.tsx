import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How TenXPros works: apply with your expertise, get a fit review within 48 hours, and if accepted, move through onboarding, a diagnostic, and a guided 12-week path to a reviewed Living AI Solution Dossier.",
};

const PRIMARY_CTA =
  "whitespace-nowrap bg-indigo-500 text-white hover:bg-indigo-400 focus:ring-indigo-400 focus:ring-offset-[#070B14]";
const SECONDARY_CTA =
  "whitespace-nowrap border-white/20 bg-transparent text-slate-100 hover:bg-white/5 focus:ring-indigo-400 focus:ring-offset-[#070B14]";

const APPLY_FLOW: Array<[string, string]> = [
  ["You apply", "Tell us about your expertise, your field, your goals, and the challenges you want to explore with AI. No payment details are required."],
  ["Fit review within 48 hours", "A human reads your application for fit and seriousness, and replies by email within 48 hours."],
  ["Acceptance email", "If it is a fit, you receive an acceptance email. Official acceptance and payment instructions come only from hello@tenxpros.com."],
  ["Payment after acceptance", "Accepted applicants receive a secure Stripe payment link, sent only from hello@tenxpros.com. Payment confirms your place; you only pay after you are accepted. TenXPros is operated by Naprolity OÜ, so your Stripe checkout or card statement may show Naprolity OÜ as the payee."],
  ["Onboarding and password setup", "You set your password, complete the starter pack, and get oriented to how the work and reviews run."],
  ["Diagnostic", "A short diagnostic shapes a personalized path around your field, risk level, stakeholders, and goals."],
  ["Week 1 begins", "You start the guided 12-week path, building toward a reviewed Living AI Solution Dossier."],
];

const PILLARS: Array<[string, string]> = [
  ["Bring your expertise", "You supply the judgment and the field knowledge. We supply the AI method and the review standard."],
  ["Reviewed against a public standard", "Work is assessed against eight published criteria, not attendance or video completion."],
  ["A credential with proof behind it", "You finish with a defensible dossier and a verifiable credential you can share."],
];

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-indigo-300/80">{children}</p>
  );
}

export default function HowItWorksPage() {
  return (
    <main className="bg-[#070B14] text-slate-300">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-indigo-600/20 blur-[140px]"
        />
        <div className="relative mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-28">
          <div className="max-w-3xl">
            <MonoLabel>How it works</MonoLabel>
            <h1 className="mt-6 text-[2.15rem] font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl">
              From your expertise to a verified credential.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              TenXPros is selective, async-first, and anchored in real work. You bring your field
              expertise; the method helps you identify, frame, and prove the right AI adoption
              opportunity, then assemble it into a reviewed Living AI Solution Dossier.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/apply" size="lg" className={PRIMARY_CTA}>
                Apply for Founding Charter
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/dossier" size="lg" variant="secondary" className={SECONDARY_CTA}>
                See the dossier
              </ButtonLink>
            </div>
          </div>

          <ul className="mt-14 grid gap-4 md:grid-cols-3">
            {PILLARS.map(([title, desc]) => (
              <li key={title} className="rounded-xl border border-white/10 bg-[#0B1120] p-6">
                <Check className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                <h2 className="mt-4 text-base font-semibold leading-snug text-white">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* After you apply */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-28">
          <div className="max-w-3xl">
            <MonoLabel>After you apply</MonoLabel>
            <h2 className="mt-5 text-3xl font-semibold leading-tight text-white md:text-4xl">
              What happens next.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-300">
              The path is clear and pressure-free. You apply for free, hear back quickly, and only
              pay if you are accepted.
            </p>
          </div>

          <ol className="mt-12 overflow-hidden rounded-xl border border-white/10">
            {APPLY_FLOW.map(([title, desc], index) => (
              <li
                key={title}
                className="flex gap-5 border-b border-white/10 bg-[#0B1120] px-5 py-5 last:border-0 sm:px-7"
              >
                <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full border border-indigo-400/40 bg-indigo-500/10 font-mono text-[0.7rem] text-indigo-200">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-[0.95rem] font-semibold leading-snug text-white">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-300">{desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/apply" size="lg" className={PRIMARY_CTA}>
              Apply for Founding Charter
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/certification" size="lg" variant="secondary" className={SECONDARY_CTA}>
              See the review standard
            </ButtonLink>
          </div>
          <p className="mt-6 max-w-2xl text-xs leading-5 text-slate-500">
            For questions or support — or to verify whether a payment link is legitimate — contact
            support@tenxpros.com. For your security, never pay a link unless it comes through an official
            TenXPros/Naprolity channel and matches our official payment details. A directory profile is
            published only after certification and your opt-in.
          </p>
        </div>
      </section>
    </main>
  );
}
