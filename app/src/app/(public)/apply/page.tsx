import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicationForm } from "@/components/marketing/application-form";
import {
  ApplyHero,
  ApplyAfter,
  ApplyFormShell,
  ApplyProof,
  ApplyFinalCta,
} from "@/components/marketing/apply-instrument";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Apply — Founding Charter",
  description:
    "Apply with one real professional problem. TenXPros is selective because the work is reviewed — no payment details required, and you pay only after acceptance.",
};

export default function ApplyPage() {
  return (
    <main className="bg-[#070B14] text-slate-300">
      {/* 1 Hero · 2 Form (moved up) · 3 What happens after · 4 Proof · 5 Final CTA */}
      <ApplyHero />
      <ApplyFormShell>
        {/* Existing application form — fields, validation, and server action unchanged */}
        <Suspense fallback={<Card>Loading application form...</Card>}>
          <ApplicationForm />
        </Suspense>
      </ApplyFormShell>
      <ApplyAfter />
      <ApplyProof />
      <ApplyFinalCta />
    </main>
  );
}
