import { Suspense } from "react";
import { ApplicationForm } from "@/components/marketing/application-form";
import {
  ApplyHero,
  ApplyAfter,
  ApplyFormShell,
  ApplyProof,
  ApplyFinalCta,
  ProScreen,
} from "@/components/marketing/apply-instrument";
import { Card } from "@/components/ui/card";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata = buildPublicMetadata({
  title: "Apply, Founding Charter",
  description:
    "Apply to the selective TenXPros 100-day journey. Tell us about your expertise and the challenges you want to explore with AI. No payment details are required, and you pay only after acceptance.",
  path: "/apply",
});

export default function ApplyPage() {
  return (
    <main className="bg-[#070B14] text-slate-300">
      {/* 1 Hero · 2 Form (moved up) · 3 What happens after · 4 Proof · 5 Final CTA */}
      <ApplyHero />
      <ApplyFormShell>
        {/* Existing application form, fields, validation, and server action unchanged */}
        <Suspense fallback={<Card>Loading application form...</Card>}>
          <ApplicationForm />
        </Suspense>
      </ApplyFormShell>
      <ProScreen />
      <ApplyAfter />
      <ApplyProof />
      <ApplyFinalCta />
    </main>
  );
}
