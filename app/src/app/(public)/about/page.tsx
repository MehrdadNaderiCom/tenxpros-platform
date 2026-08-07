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
import { buildPublicMetadata } from "@/lib/seo";

export const metadata = buildPublicMetadata({
  title: "About, Why TenXPros exists",
  description:
    "TenXPros is a selective 100-day journey that helps experienced professionals turn their expertise into reviewed AI adoption work, built around an explicit public standard rather than attendance.",
  path: "/about",
});

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
