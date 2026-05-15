import type { Metadata } from "next";
import { BadgeGallery } from "@/components/marketing/marketing-sections";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Certification",
};

export default function CertificationPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-12 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        eyebrow="Credential"
        title="Certified TenXPro signals practical, responsible AI adoption capability."
        description="Certification is based on dossier quality, module artifacts, capstone evidence, and professional judgment."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Certified", "The participant meets the capstone standard and receives the Capstone Seal."],
          ["Conditionally certified", "The participant meets the standard with specified follow-up conditions."],
          ["Completed, not certified", "The participant completed the program without reaching certification threshold."],
        ].map(([title, copy]) => (
          <Card key={title}>
            <h2 className="text-xl font-semibold text-navy-900">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p>
          </Card>
        ))}
      </div>
      <section className="space-y-6">
        <h2 className="text-3xl font-semibold text-navy-900">Badge catalog</h2>
        <BadgeGallery />
      </section>
    </main>
  );
}
