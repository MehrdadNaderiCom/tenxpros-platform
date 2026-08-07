import {
  DossierHero,
  DossierProves,
  DossierAnatomy,
  DossierAssetsMap,
  DossierReviewStandard,
  DossierSample,
  DossierDifference,
  DossierFinalCta,
} from "@/components/marketing/dossier-instrument";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata = buildPublicMetadata({
  title: "Living AI Solution Dossier",
  description:
    "The Living AI Solution Dossier is the reviewed proof artifact built through the TenXPros 100-day journey: 12 structured sections, eight assembled assets, and an explicit review standard.",
  path: "/dossier",
});

export default function DossierPage() {
  return (
    <main className="bg-[#070B14] text-slate-300">
      <DossierHero />
      <DossierProves />
      <DossierAnatomy />
      <DossierAssetsMap />
      <DossierReviewStandard />
      <DossierSample />
      <DossierDifference />
      <DossierFinalCta />
    </main>
  );
}
