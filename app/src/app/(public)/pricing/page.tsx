import type { Metadata } from "next";
import {
  PricingHero,
  PricingCard,
  PricingLadder,
  PricingValue,
  PricingCompare,
  PricingProof,
  PricingPayment,
  PricingFaq,
  PricingFinalCta,
} from "@/components/marketing/pricing-instrument";

export const metadata: Metadata = {
  title: "Pricing — Founding Charter",
  description:
    "Apply first, pay only after acceptance. The Founding Charter ($997) is open for the first 10 accepted members — a reviewed Living AI Solution Dossier, not a video course. Preview the sample before you apply.",
};

export default function PricingPage() {
  return (
    <main className="bg-[#070B14] text-slate-300">
      {/* 1 Hero · 2 Founding card · 3 Ladder · 4 Value · 5 Compare · 6 Proof · 7 Payment · 8 FAQ · 9 Final CTA */}
      <PricingHero />
      <PricingCard />
      <PricingLadder />
      <PricingValue />
      <PricingCompare />
      <PricingProof />
      <PricingPayment />
      <PricingFaq />
      <PricingFinalCta />
    </main>
  );
}
