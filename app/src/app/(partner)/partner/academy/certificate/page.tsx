import { redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/partner/auth";
import { getAcademyOverview } from "@/lib/academy/queries";
import { absoluteUrl } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-shell";
import { PrintButton } from "@/components/academy/print-button";

export const dynamic = "force-dynamic";

export default async function CertificatePage() {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");
  const overview = await getAcademyOverview(current.partner.id);

  if (!overview.badge) {
    return (
      <div className="space-y-6">
        <PageHeader title="Completion certificate" description="" />
        <Card>
          <p className="text-sm text-slate-600">Your certificate appears here once you have passed all modules of the Partner Academy.</p>
          <ButtonLink href="/partner/academy" variant="secondary" size="sm" className="mt-4">Back to the Academy</ButtonLink>
        </Card>
      </div>
    );
  }

  const b = overview.badge;
  const verifyUrl = absoluteUrl(`/academy/verify/${b.serial}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <PageHeader title="Completion certificate" description="Your verifiable record of finishing the Partner Academy." />
        <PrintButton />
      </div>

      <div className="mx-auto max-w-3xl rounded-xl border-2 border-gold-500 bg-white p-10 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-800">TenXPros Partner Academy</p>
        <h1 className="mt-6 text-2xl font-semibold text-navy-900">Certificate of Completion</h1>
        <p className="mt-6 text-sm text-slate-600">This certifies that</p>
        <p className="mt-2 text-3xl font-semibold text-navy-900">{current.partner.displayName}</p>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 mx-auto">
          has completed the TenXPros Partner Academy, reading every lesson, working every exercise, and passing every
          module exam against the program standard.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-slate-600">
          <span>Serial <span className="font-medium text-navy-900">{b.serial}</span></span>
          <span>Year <span className="font-medium text-navy-900">{b.year}</span></span>
          <span>Awarded <span className="font-medium text-navy-900">{b.awardedAt.toLocaleDateString()}</span></span>
        </div>
        <p className="mt-6 text-xs text-slate-500">Verify this certificate at {verifyUrl}</p>
      </div>
    </div>
  );
}
