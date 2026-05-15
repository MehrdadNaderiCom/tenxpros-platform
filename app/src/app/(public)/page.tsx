import type { Metadata } from "next";
import { MarketingHero, JourneySteps, proofCards } from "@/components/marketing/marketing-sections";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Certified AI Adoption for Professionals",
};

export default function HomePage() {
  return (
    <main>
      <MarketingHero />
      <section className="bg-neutral-50">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 py-16 md:grid-cols-3 md:px-8">
          {proofCards.map(([Icon, title, description]) => (
            <Card key={title} className="space-y-3">
              <Icon className="h-6 w-6 text-gold-800" />
              <h2 className="text-xl font-semibold text-navy-900">{title}</h2>
              <p className="text-sm leading-6 text-slate-600">{description}</p>
            </Card>
          ))}
        </div>
      </section>
      <JourneySteps />
      <section className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">
              Founding Charter
            </p>
            <h2 className="text-3xl font-semibold text-navy-900">Tier 1 is open for the first 10 members.</h2>
            <p className="text-slate-600">
              Honest scarcity, transparent pricing transitions, and a selective admission review.
            </p>
          </div>
          <ButtonLink href="/pricing" size="lg">
            View pricing
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
