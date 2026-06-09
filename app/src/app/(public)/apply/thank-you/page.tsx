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
        <p className="text-slate-600">
          The review team will personally assess your application for fit, problem clarity, and readiness — typically
          within 48 hours. You will receive your decision by email, and if you are accepted it will include your payment
          and onboarding details. No payment is requested before acceptance.
        </p>
        {searchParams?.id ? <p className="text-sm text-slate-500">Application ID: {searchParams.id}</p> : null}
        <ButtonLink href="/" variant="secondary">
          Return home
        </ButtonLink>
      </Card>
    </main>
  );
}
