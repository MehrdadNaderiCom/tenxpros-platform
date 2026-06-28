import type { Metadata } from "next";
import { Suspense } from "react";
import { PartnerApplicationForm } from "@/components/marketing/partner-application-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Apply to the TenXPros Partner Program",
  description:
    "Apply to help sell, deliver and grow TenXPros on a 90-day pilot. Tell us about your background and the organisations you would pursue.",
};

export default function PartnerApplyPage() {
  return (
    <main className="bg-white">
      <div className="border-b border-neutral-200 bg-navy-50">
        <div className="mx-auto max-w-3xl px-6 py-12 md:px-8 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">Partner Program</p>
          <h1 className="mt-3 text-3xl font-semibold text-navy-900 md:text-4xl">Apply to become a TenXPros partner</h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            We read every application personally. Tell us about your background and the organisations you would pursue,
            confirm that you have read the Partner Program Terms, and if it is a good fit we will invite you onto the
            TenXPros Partner Panel to begin your 90-day pilot.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <Suspense fallback={<Card>Loading the application form…</Card>}>
          <PartnerApplicationForm />
        </Suspense>
      </div>
    </main>
  );
}
