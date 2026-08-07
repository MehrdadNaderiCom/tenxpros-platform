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
import { JsonLd } from "@/components/seo/json-ld";
import { buildPublicMetadata, ORGANIZATION_STRUCTURED_DATA } from "@/lib/seo";

export const metadata = buildPublicMetadata({
  title: "Selective AI Adoption Certification for Experienced Professionals",
  description:
    "Lead AI adoption in your field through a selective 100-day journey with a 12-week guided learning path and a reviewed Living AI Solution Dossier. Apply first, pay only after acceptance.",
  path: "/",
  homepageLanguageAlternates: true,
});

export default function HomePage() {
  return (
    <main className="bg-[#070B14] text-slate-300">
      <JsonLd data={ORGANIZATION_STRUCTURED_DATA} />
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
