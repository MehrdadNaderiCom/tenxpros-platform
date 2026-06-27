import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Become a TenXPros Partner",
  description:
    "Help sell, deliver or grow TenXPros and earn defined commission on real, confirmed work. A 90-day performance-based pilot leads to a three-tier partner ladder. No equity, no country, no industry, no exclusivity.",
};

const TIERS = [
  {
    name: "Tier 1 — Referral Partner",
    blurb: "Where every partner starts, on a 90-day pilot.",
    points: ["Register and earn on confirmed deals", "Up to 3 open registered accounts", "Referral credential"],
  },
  {
    name: "Tier 2 — Certified Partner",
    blurb: "Earned by real, collected results across sales and delivery.",
    points: [
      "Up to 5 open accounts, longer protection",
      "Priority on company leads",
      "Certified credential + public listing + reference letter",
    ],
  },
  {
    name: "Tier 3 — Performance Territory Builder",
    blurb: "A proven partner with a time-limited, non-exclusive industry or region focus.",
    points: [
      "Up to 10 open accounts, longest protection",
      "A small, gradually rising focus bonus",
      "Public recognition as the lead partner for your focus",
    ],
  },
];

const FUNCTIONS = [
  ["Basic Introduction", "Introduce a relevant contact — paid only if it closes."],
  ["Origination", "Source a qualified lead that closes — the door-opener reward."],
  ["Closing", "Lead the sale to a signed, binding agreement."],
  ["Delivery / Coaching", "Deliver or coach the offering, by fixed fee or approved percentage."],
];

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-6xl px-6 md:px-8 ${className}`}>{children}</section>;
}

export default function PartnersPage() {
  return (
    <main className="bg-white text-slate-700">
      {/* Hero */}
      <div className="border-b border-neutral-200 bg-gradient-to-b from-navy-50 to-white">
        <Section className="py-16 md:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">TenXPros Partner Program</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-navy-900 md:text-5xl">
            Help build TenXPros, and earn for real, confirmed work.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
            Sell, deliver or grow TenXPros on a clear, performance-based basis. You earn a defined commission only when
            there is a confirmed deal registration, a real role performed, and cleared money received — never a share of
            the company.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/partners/apply" size="lg" className="bg-indigo-500 text-white hover:bg-indigo-400">
              Apply now
            </ButtonLink>
            <ButtonLink href="#how" size="lg" variant="secondary">
              How it works
            </ButtonLink>
          </div>
          <p className="mt-6 text-sm font-medium text-slate-500">
            No equity · no country · no industry · no exclusivity · no long-term lock-in
          </p>
        </Section>
      </div>

      {/* The core rule */}
      <Section className="py-14">
        <Card className="border-navy-200 bg-navy-50">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-800">The core rule</p>
          <p className="mt-3 text-lg font-medium leading-relaxed text-navy-900">
            Partner right = a registered opportunity + a real role performed + money actually received + a defined time
            window + active management.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Everything runs on the TenXPros Partner Panel. Nothing is approved, registered or confirmed except on the
            panel — so there is never any doubt about what was agreed and when.
          </p>
        </Card>
      </Section>

      {/* How it works */}
      <Section className="py-6" >
        <div id="how" className="scroll-mt-24">
          <h2 className="text-2xl font-semibold text-navy-900">How the relationship works, stage by stage</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              ["1. Pilot & activation", "Every partner starts on a 90-day pilot and passes the Activation Gate before any outreach."],
              ["2. Register & earn", "Register each specific opportunity. When confirmed on the panel, it is protected for a defined period."],
              ["3. Tier progression", "By real, recorded results you may be invited to Tier 2 and then Tier 3. Never automatic."],
              ["4. Focus (rare)", "A proven Tier 3 partner may earn a time-limited, non-exclusive industry or region focus."],
            ].map(([title, body]) => (
              <Card key={title}>
                <p className="font-semibold text-navy-900">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* Tiers */}
      <Section className="py-14">
        <h2 className="text-2xl font-semibold text-navy-900">The three-tier ladder</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Every tier earns commission on all functions at the same rates. What grows with tier is protection, priority
          and recognition — and, at the top, a focus.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {TIERS.map((tier) => (
            <Card key={tier.name} className="flex flex-col">
              <h3 className="text-lg font-semibold text-navy-900">{tier.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{tier.blurb}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {tier.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-gold-500" aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Section>

      {/* Functions / how you earn */}
      <Section className="py-6">
        <h2 className="text-2xl font-semibold text-navy-900">How you earn</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Commission is earned by function, calculated on net receipts actually received and cleared. You earn only for
          the functions you actually perform, and the company always keeps the clear majority of every deal.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {FUNCTIONS.map(([title, body]) => (
            <Card key={title}>
              <p className="font-semibold text-navy-900">{title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Final CTA */}
      <Section className="py-16">
        <Card className="flex flex-col items-start gap-5 border-navy-200 bg-navy-900 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Ready to test the opportunity?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-100">
              Apply to the 90-day pilot. We review every application personally. There is no payment, no obligation, and
              no lock-in.
            </p>
          </div>
          <ButtonLink href="/partners/apply" size="lg" className="bg-gold-500 text-navy-900 hover:bg-gold-400">
            Apply now
          </ButtonLink>
        </Card>
      </Section>
    </main>
  );
}
