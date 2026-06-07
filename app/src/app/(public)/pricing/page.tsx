import type { Metadata } from "next";
import { PricingGrid } from "@/components/marketing/marketing-sections";
import { SampleDossierPreview } from "@/components/marketing/sample-dossier-preview";
import { PageHeader } from "@/components/shared/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-12 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        eyebrow="Charter pricing"
        title="Founding Charter is open. Later tiers are preview only."
        description="Tier 1 is active for the first 10 members. Later tiers are shown in advance so applicants understand the pricing path before they apply."
      />
      <SampleDossierPreview variant="pricing" />
      <PricingGrid />
      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-navy-900">Payment happens after acceptance.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            TenXPros uses selective admission and manual Stripe Payment Links at launch. Applying does not create an automatic payment obligation.
          </p>
        </div>
        <ButtonLink href="/apply">Apply for Founding Charter</ButtonLink>
      </Card>
    </main>
  );
}
