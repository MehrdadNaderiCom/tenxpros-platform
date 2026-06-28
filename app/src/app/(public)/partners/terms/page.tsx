import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { PARTNER_TERMS_LEAD, PARTNER_TERMS_SECTIONS } from "@/lib/partner/terms";

export const metadata: Metadata = {
  title: "TenXPros Partner Program Terms",
  description:
    "How the TenXPros Partner Program works: registering opportunities, how commission is earned and paid, the three-tier ladder, and the contracting company. A plain-language summary of the 90-Day Partner Pilot Letter and the full Partner Program Agreement.",
};

export default function PartnerTermsPage() {
  return (
    <main className="bg-white">
      <div className="border-b border-neutral-200 bg-navy-50">
        <div className="mx-auto max-w-3xl px-6 py-12 md:px-8 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">Partner Program</p>
          <h1 className="mt-3 text-3xl font-semibold text-navy-900 md:text-4xl">Partner Program Terms</h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">{PARTNER_TERMS_LEAD}</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <div className="space-y-8">
          {PARTNER_TERMS_SECTIONS.map((section, index) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-navy-900">
                {index + 1}. {section.title}
              </h2>
              {section.body?.map((paragraph, i) => (
                <p key={i} className="mt-2 text-sm leading-7 text-slate-600">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-3 space-y-2">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2.5 text-sm leading-6 text-slate-600">
                      <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold-500" aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-neutral-200 pt-8">
          <ButtonLink href="/partners/apply" className="bg-indigo-500 text-white hover:bg-indigo-400">
            Apply to become a partner
          </ButtonLink>
          <ButtonLink href="/partners" variant="secondary">
            Back to the Partner Program
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
