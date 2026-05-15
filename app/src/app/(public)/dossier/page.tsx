import type { Metadata } from "next";
import { DossierSectionGrid } from "@/components/marketing/marketing-sections";
import { PageHeader } from "@/components/shared/page-shell";

export const metadata: Metadata = {
  title: "Living AI Solution Dossier",
};

export default function DossierPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-12 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        eyebrow="Defensible output"
        title="The Dossier is the professional artifact that makes the credential meaningful."
        description="Participants do not merely complete lessons. They build a living, reviewable AI solution dossier with context, evidence, workflow, risk, adoption, value, and foresight."
      />
      <DossierSectionGrid />
    </main>
  );
}
