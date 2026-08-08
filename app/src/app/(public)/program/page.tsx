import {
  ProgramHero,
  ProgramWhy,
  ProgramPhases,
  ProgramFormat,
  ProgramModules,
  ProgramAssets,
  ProgramPersonalization,
  ProgramReview,
  ProgramNotTools,
  ProgramProof,
  ProgramFinalCta,
} from "@/components/marketing/program-instrument";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata = buildPublicMetadata({
  title: "The Method, Frame · Design · Prove · Foresee",
  description:
    "The TenX Method powers a 100-day journey with a 12-week guided learning path across four phases, 11 core modules, eight connected assets, and a reviewed Living AI Solution Dossier.",
  path: "/program",
});

export default function ProgramPage() {
  return (
    <main className="bg-[#070B14] text-slate-300">
      {/* 1 Hero · 2 Why · 3 Four phases · 3b Format & commitment · 4 Guided path · 5 Eight assets · 6 Personalization · 7 Review checkpoints · 8 Not a tools course · 9 Proof · 10 Final CTA */}
      <ProgramHero />
      <ProgramWhy />
      <ProgramPhases />
      <ProgramFormat />
      <ProgramModules />
      <ProgramAssets />
      <ProgramPersonalization />
      <ProgramReview />
      <ProgramNotTools />
      <ProgramProof />
      <ProgramFinalCta />
    </main>
  );
}
