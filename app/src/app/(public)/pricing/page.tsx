import { prisma } from "@/lib/prisma";
import { pricingTiers as fallbackTiers } from "@/lib/program-data";
import type { PricingTierView } from "@/lib/pricing";
import {
  PricingHero,
  PricingCard,
  PricingLadder,
  PricingValue,
  PricingModuleIncludes,
  PricingCompare,
  PricingProof,
  PricingPayment,
  PricingFaq,
  PricingFinalCta,
  PRICING_FAQS,
} from "@/components/marketing/pricing-instrument";
import { JsonLd } from "@/components/seo/json-ld";
import { buildFaqStructuredData, buildPublicMetadata } from "@/lib/seo";

export const metadata = buildPublicMetadata({
  title: "Pricing, Founding Charter",
  description:
    "Pricing for the selective TenXPros 100-day journey. Apply first and pay only after acceptance; the Founding Charter is open while limited founding review capacity remains.",
  path: "/pricing",
});

// Prices are read from the DB (the admin-managed PricingTier rows) so that
// /pricing and /admin/pricing share a single source of truth. program-data is a
// safe fallback if the DB query fails or returns nothing.
export const dynamic = "force-dynamic";

async function getPricingTiers(): Promise<PricingTierView[]> {
  try {
    const tiers = await prisma.pricingTier.findMany({ orderBy: { price: "asc" } });
    if (tiers.length > 0) {
      return tiers.map((t) => ({
        tier: String(t.tier),
        name: t.name,
        price: t.price,
        isActive: t.isActive,
      }));
    }
  } catch {
    // fall through to the program-data fallback below
  }
  return fallbackTiers.map((t) => ({
    tier: String(t.tier),
    name: t.name,
    price: t.price,
    isActive: t.isActive,
  }));
}

export default async function PricingPage() {
  const tiers = await getPricingTiers();
  const priceOf = (tier: string) => tiers.find((t) => t.tier === tier)?.price;
  const founding = priceOf("FOUNDING") ?? 997;
  const standard = priceOf("STANDARD") ?? 2497;

  return (
    <main className="bg-[#070B14] text-slate-300">
      <JsonLd data={buildFaqStructuredData("/pricing", PRICING_FAQS)} />
      {/* 1 Hero · 2 Founding card · 3 Ladder · 4 Value · 4b Module includes · 5 Compare · 6 Proof · 7 Payment · 8 FAQ · 9 Final CTA */}
      <PricingHero founding={founding} standard={standard} />
      <PricingCard founding={founding} standard={standard} />
      <PricingLadder tiers={tiers} />
      <PricingValue />
      <PricingModuleIncludes />
      <PricingCompare founding={founding} />
      <PricingProof />
      <PricingPayment />
      <PricingFaq />
      <PricingFinalCta />
    </main>
  );
}
