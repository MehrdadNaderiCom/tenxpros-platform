import type { Metadata } from "next";
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
} from "@/components/marketing/pricing-instrument";

export const metadata: Metadata = {
  title: "Pricing — Founding Charter",
  description:
    "Apply first, pay only after acceptance. The Founding Charter ($997 USD) is open during a limited founding review-capacity window. Future standard pricing is higher; earn a reviewed Living AI Solution Dossier and preview the sample before you apply.",
};

export default function PricingPage() {
  return (
    <main className="bg-[#070B14] text-slate-300">
      {/* 1 Hero · 2 Founding card · 3 Ladder · 4 Value · 4b Module includes · 5 Compare · 6 Proof · 7 Payment · 8 FAQ · 9 Final CTA */}
      <PricingHero />
      <PricingCard />
      <PricingLadder />
      <PricingValue />
      <PricingModuleIncludes />
      <PricingCompare />
      <PricingProof />
      <PricingPayment />
      <PricingFaq />
      <PricingFinalCta />
    </main>
  );
}
