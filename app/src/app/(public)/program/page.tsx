import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "The Method, Frame · Design · Prove · Foresee",
  description:
    "The TenX Method: a 12-week applied path organized into 4 phases, with 11 core modules plus a final dossier and capstone review. Bring your expertise, build eight connected assets, and assemble a reviewed Living AI Solution Dossier.",
};

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
