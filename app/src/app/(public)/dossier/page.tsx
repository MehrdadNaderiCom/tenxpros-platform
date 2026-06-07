import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Living AI Solution Dossier",
  description:
    "The Living AI Solution Dossier is the reviewed proof artifact behind the TenXPros credential — 12 structured sections, eight assembled assets, and an explicit review standard. Preview the illustrative sample.",
};

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
