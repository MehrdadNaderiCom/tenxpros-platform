import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { POST_APPLICATION_NOTICE } from "@/lib/payment-disclosure";

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
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-left">
          <p className="text-sm font-semibold text-navy-900">Payment safety</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{POST_APPLICATION_NOTICE}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Questions about payment, enrollment, access, or whether a payment link is legitimate? Email{" "}
            <a href="mailto:support@tenxpros.com" className="font-medium text-indigo-600 hover:text-indigo-500">
              support@tenxpros.com
            </a>{" "}
            to verify before paying.
          </p>
        </div>
        <ButtonLink href="/" variant="secondary">
          Return home
        </ButtonLink>
      </Card>
    </main>
  );
}
