import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Application Received",
};

export default function ThankYouPage({ searchParams }: { searchParams?: { id?: string } }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:px-8 md:py-24">
      <Card className="space-y-5 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">
          Application received
        </p>
        <h1 className="text-3xl font-semibold text-navy-900">Thank you for applying to TenXPros.</h1>
        <p className="text-balance text-slate-600">
          Our review team reads every application personally and replies by email within 48 hours. If you are accepted,
          that email includes your payment and onboarding details.
        </p>
        {searchParams?.id ? <p className="text-sm text-slate-500">Application ID: {searchParams.id}</p> : null}
        <ButtonLink href="/" variant="secondary">
          Return home
        </ButtonLink>
      </Card>
    </main>
  );
}
