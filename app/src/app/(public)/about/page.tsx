import type { Metadata } from "next";
import {
  AboutHero,
  AboutProblem,
  AboutAnswer,
  AboutStandard,
  AboutFounder,
  AboutPrinciples,
  AboutTrust,
  AboutFinalCta,
} from "@/components/marketing/about-instrument";

export const metadata: Metadata = {
  title: "About — Why TenXPros exists",
  description:
    "TenXPros exists because AI adoption is now professional judgment work. It helps experienced professionals turn one real problem into reviewed AI adoption work — built around an explicit, public standard, not attendance.",
};

export default function AboutPage() {
  return (
    <main className="bg-[#070B14] text-slate-300">
      {/* 1 Hero · 2 Problem · 3 Answer · 4 Standard · 5 Founder · 6 Principles · 7 Trust (incl. quiet boundary) · 8 Final CTA */}
      <AboutHero />
      <AboutProblem />
      <AboutAnswer />
      <AboutStandard />
      <AboutFounder />
      <AboutPrinciples />
      <AboutTrust />
      <AboutFinalCta />
    </main>
  );
}
