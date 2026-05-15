import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicationForm } from "@/components/marketing/application-form";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Apply",
};

export default function ApplyPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-10 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        eyebrow="Application"
        title="Apply with a real professional problem."
        description="TenXPros reviews fit, seriousness, readiness, and whether your problem is appropriate for responsible AI adoption work."
      />
      <Suspense fallback={<Card>Loading application form...</Card>}>
        <ApplicationForm />
      </Suspense>
    </main>
  );
}
