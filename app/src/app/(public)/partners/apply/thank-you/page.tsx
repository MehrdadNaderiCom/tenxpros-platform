import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Partner application received",
};

export default function PartnerThankYouPage({ searchParams }: { searchParams?: { id?: string } }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:px-8 md:py-24">
      <Card className="space-y-5 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">Application received</p>
        <h1 className="text-3xl font-semibold text-navy-900">Thank you for applying to the Partner Program.</h1>
        <p className="text-balance text-slate-600">
          We review every application personally. If it is a fit, you will receive an email inviting you onto the
          TenXPros Partner Panel to begin your 90-day pilot.
        </p>
        {searchParams?.id ? <p className="text-sm text-slate-500">Application ID: {searchParams.id}</p> : null}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-left">
          <p className="text-sm font-semibold text-navy-900">What happens next</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Once you are confirmed on the panel, you complete a short Activation Gate and can begin registering
            opportunities. You earn a defined commission on every confirmed deal, paid on cleared receipts, and each step
            is recorded on the Partner Panel.
          </p>
        </div>
        <ButtonLink href="/" variant="secondary">
          Return home
        </ButtonLink>
      </Card>
    </main>
  );
}
