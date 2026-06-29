import type { Metadata } from "next";
import {
  HomeHero,
  HomeShift,
  HomeAssets,
  HomeMethod,
  HomeCertification,
  HomeAudience,
  HomeFinalCta,
} from "@/components/marketing/home-instrument";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";

export const metadata: Metadata = {
  title: "Selective AI Adoption Certification for Experienced Professionals",
  description:
    "Lead AI adoption in your field. A selective 12-week certification where experienced professionals turn their expertise into a reviewed Living AI Solution Dossier. Apply first, pay only after acceptance.",
};

export default function HomePage() {
  return (
    <main className="bg-[#070B14] text-slate-300">
      {/* 1 Hero · 2 Shift · 3 Eight assets · 4 TenX Method · 5 Review standard/Certification · 6 For/Not-for · 7 Founding Charter CTA */}
      <HomeHero />
      <HomeShift />
      <HomeAssets />
      <HomeMethod />
      <HomeCertification />
      <HomeAudience />
      <HomeFinalCta />
      <NewsletterSignup />
    </main>
  );
}
