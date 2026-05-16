import type { Metadata } from "next";
import { DossierSectionGrid } from "@/components/marketing/marketing-sections";
import { PageHeader } from "@/components/shared/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Living AI Solution Dossier",
};

export default function DossierPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-12 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        eyebrow="Defensible output"
        title="The Living AI Solution Dossier is the work behind the credential."
        description="Participants do not merely complete lessons. They build a reviewable professional artifact with context, evidence, workflow, risk, adoption, value, and foresight."
      />
      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-navy-900">Reviewed section by section.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The Dossier is designed to be useful at work: specific enough to guide action, sober enough to defend, and living enough to improve.
          </p>
        </div>
        <ButtonLink href="/apply">Apply for Founding Charter</ButtonLink>
      </Card>
      <DossierSectionGrid />
    </main>
  );
}
