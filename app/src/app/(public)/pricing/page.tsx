import type { Metadata } from "next";
import { PricingGrid } from "@/components/marketing/marketing-sections";
import { PageHeader } from "@/components/shared/page-shell";

export const metadata: Metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-12 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        eyebrow="Charter pricing"
        title="Five-tier charter pricing. Honest scarcity. Transparent transitions."
        description="Tier 1 is active at launch. Later tiers are shown in advance so applicants understand the pricing path before they apply."
      />
      <PricingGrid />
    </main>
  );
}
