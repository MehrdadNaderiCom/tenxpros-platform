import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { PartnerTermsDialog } from "@/components/marketing/partner-terms-modal";
import { PROGRAM_CONFIG_DEFAULTS as CFG } from "@/lib/partner/config";
import { formatBp } from "@/lib/partner/constants";

// Every rate, cap, threshold and window below renders from the config source of
// truth (PROGRAM_CONFIG_DEFAULTS), so a change to a number there updates this page
// and the terms text together, with no hardcoded literal to drift.
const deliveryBand = `fixed fee, or ${formatBp(CFG.deliveryPercentMinBp)} to ${formatBp(CFG.deliveryPercentMaxBp)}`;

export const metadata: Metadata = {
  title: "Become a TenXPros Partner",
  description:
    `Help sell, deliver and grow TenXPros, and earn a clear, defined commission on the opportunities you bring to a close. A ${CFG.pilotDays}-day pilot leads to a transparent three-tier partner ladder, with recognition you keep.`,
};

const STAGES: Array<[string, string]> = [
  [
    "Pilot and activation",
    `Every partner starts on a ${CFG.pilotDays}-day pilot and completes a short Activation Gate. Once the company confirms you on the panel, you are ready to begin.`,
  ],
  [
    "Register and earn",
    "You register each opportunity before you pursue it. The moment it is confirmed on the panel it is protected for you, and you earn commission on the functions you perform once the customer has paid.",
  ],
  [
    "Grow and progress",
    "By real, recorded results you can be invited to Tier 2 and then Tier 3, unlocking more open accounts, longer protection on your work, and priority on company leads.",
  ],
  [
    "Lead a focus",
    "A proven Tier 3 partner can earn a focus on one industry or region, with a focus bonus and public recognition as its lead partner.",
  ],
];

const TIERS = [
  {
    eyebrow: "Tier 1",
    name: "Referral Partner",
    blurb: `Where every partner begins, on a ${CFG.pilotDays}-day pilot.`,
    points: [
      "Register opportunities and earn on every confirmed deal",
      `Hold up to ${CFG.maxOpenAccountsTier1} open registered accounts`,
      "Use the TenXPros Referral Partner credential",
    ],
  },
  {
    eyebrow: "Tier 2",
    name: "Certified Partner",
    blurb: "Earned by real, collected results across sales and delivery.",
    points: [
      `Hold up to ${CFG.maxOpenAccountsTier2} open accounts, with longer protection`,
      "Priority on company leads, and a growth bonus",
      "Certified credential, a public listing, and a letter of recognition",
    ],
  },
  {
    eyebrow: "Tier 3",
    name: "Territory Builder",
    blurb: "For a proven partner with a focus on one industry or region.",
    points: [
      `Hold up to ${CFG.maxOpenAccountsTier3} open accounts, with the longest protection`,
      "First priority on leads within your focus",
      "A focus bonus and public recognition as the lead partner",
    ],
  },
];

const FUNCTIONS: Array<[string, string]> = [
  ["Basic Introduction", "Introduce a relevant contact. You earn when that introduction becomes a paid deal."],
  ["Origination", "Source a qualified opportunity that closes. This is the reward for opening the door on a real account."],
  ["Closing", "Lead the sale through to a signed, binding agreement."],
  ["Delivery and Coaching", "Deliver or coach the offering, paid by a fixed fee or an approved percentage."],
];

const COMMISSION_ROWS: Array<[string, string, string]> = [
  ["Basic Introduction", formatBp(CFG.basicIntroductionBp), formatBp(CFG.basicIntroductionBp)],
  ["Qualified Origination", formatBp(CFG.qualifiedOriginationB2cBp), formatBp(CFG.qualifiedOriginationB2bBp)],
  ["Strong Origination", formatBp(CFG.strongOriginationB2cBp), formatBp(CFG.strongOriginationB2bBp)],
  ["Closing", formatBp(CFG.closingB2cBp), formatBp(CFG.closingB2bBp)],
  ["Delivery or Coaching", deliveryBand, deliveryBand],
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
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight text-navy-900 md:text-5xl">
            Help build TenXPros, and earn for the work you do.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
            Sell, deliver and grow TenXPros, and earn a clear, defined commission on every opportunity you bring to a
            close. Each one is registered, protected and tracked on the Partner Panel, so you always know where you
            stand and what you have earned.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/partners/apply" size="lg" className="bg-indigo-500 text-white hover:bg-indigo-400">
              Apply to become a partner
            </ButtonLink>
            <ButtonLink href="#how" size="lg" variant="secondary">
              How it works
            </ButtonLink>
          </div>
          <p className="mt-6 text-sm font-medium text-slate-500">
            A clear three-tier path, transparent commission, and recognition you carry into your career.
          </p>
        </Section>
      </div>

      {/* The principle */}
      <Section className="py-14">
        <Card className="border-navy-200 bg-navy-50">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-800">The simple principle</p>
          <p className="mt-3 text-lg font-medium leading-relaxed text-navy-900">
            Your right to earn is the sum of real things: a registered opportunity, a role you actually performed, money
            received and cleared, a defined time window, and an account you actively manage.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Everything runs on the TenXPros Partner Panel. Each registration, confirmation and payment is recorded
            there, so you always have a clear, shared record of what was agreed and what you have earned.
          </p>
        </Card>
      </Section>

      {/* How it works */}
      <Section className="py-6">
        <div id="how" className="scroll-mt-24">
          <h2 className="text-2xl font-semibold text-navy-900">How the relationship works, stage by stage</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STAGES.map(([title, body], index) => (
              <Card key={title} className="flex h-full flex-col">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-800">Step {index + 1}</span>
                <p className="mt-2 font-semibold text-navy-900">{title}</p>
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
          Every tier earns commission on all functions at the same rates. What grows with each tier is protection,
          priority and recognition, and at the top, a focus on an industry or region.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {TIERS.map((tier) => (
            <Card key={tier.eyebrow} className="flex h-full flex-col">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-800">{tier.eyebrow}</span>
              <h3 className="mt-1 text-xl font-semibold text-navy-900">{tier.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{tier.blurb}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {tier.points.map((point) => (
                  <li key={point} className="flex gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-gold-500" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Section>

      {/* How you earn */}
      <Section className="py-6">
        <h2 className="text-2xl font-semibold text-navy-900">How you earn</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Commission is earned by function and calculated on net receipts actually received and cleared. You earn for
          the functions you perform on each closed deal.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {FUNCTIONS.map(([title, body]) => (
            <Card key={title} className="h-full">
              <p className="font-semibold text-navy-900">{title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
            </Card>
          ))}
        </div>

        {/* Commission table */}
        <Card className="mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-white">
                <th className="px-5 py-3 font-semibold">Function</th>
                <th className="px-5 py-3 font-semibold">B2C Charter</th>
                <th className="px-5 py-3 font-semibold">B2B Engagement</th>
              </tr>
            </thead>
            <tbody>
              {COMMISSION_ROWS.map(([fn, b2c, b2b], index) => (
                <tr key={fn} className={index % 2 ? "bg-neutral-50" : "bg-white"}>
                  <td className="px-5 py-3 font-medium text-navy-900">{fn}</td>
                  <td className="px-5 py-3 text-slate-700">{b2c}</td>
                  <td className="px-5 py-3 text-slate-700">{b2b}</td>
                </tr>
              ))}
              <tr className="border-t border-neutral-200 bg-navy-50">
                <td className="px-5 py-3 font-semibold text-navy-900">Cap per deal</td>
                <td className="px-5 py-3 font-semibold text-navy-900">{formatBp(CFG.capB2cBp)}</td>
                <td className="px-5 py-3 font-semibold text-navy-900">{formatBp(CFG.capB2bBp)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          The strong origination rate on B2C applies after {CFG.strongOriginationUnlockSeats} paid seats, or by
          confirmation on the panel. A Tier 3 focus account can rise gradually above the cap to {formatBp(CFG.tier3FocusHardCeilingBp)}. You can read the full
          detail in the <PartnerTermsDialog className="text-xs">Partner Program Terms</PartnerTermsDialog>.
        </p>
      </Section>

      {/* Recognition */}
      <Section className="py-14">
        <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-navy-900">Recognition you keep</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              At every tier you hold a real, professional credential. Certified partners can be listed by name on
              tenxpros.com and request a written letter of recognition confirming their role and verified results. These
              are yours to carry into the rest of your career.
            </p>
          </div>
          <PartnerTermsDialog className="whitespace-nowrap text-sm">Read the full terms</PartnerTermsDialog>
        </Card>
      </Section>

      {/* Final CTA */}
      <Section className="py-16">
        <Card className="flex flex-col items-start gap-5 border-navy-200 bg-navy-900 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Ready to begin?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-100">
              Apply to the {CFG.pilotDays}-day pilot. We read every application personally, and you start as soon as you
              are confirmed on the panel.
            </p>
          </div>
          <ButtonLink href="/partners/apply" size="lg" className="bg-gold-500 text-navy-900 hover:bg-gold-400">
            Apply to become a partner
          </ButtonLink>
        </Card>
      </Section>
    </main>
  );
}
