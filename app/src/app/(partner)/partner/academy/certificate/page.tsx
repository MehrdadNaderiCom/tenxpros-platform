import { redirect } from "next/navigation";
import { Award } from "lucide-react";
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
          <p className="text-sm text-slate-600">
            Your certificate appears here once you pass the comprehensive final exam, which unlocks after every module is complete.
          </p>
          <ButtonLink href="/partner/academy" variant="secondary" size="sm" className="mt-4">Back to the Academy</ButtonLink>
        </Card>
      </div>
    );
  }

  const b = overview.badge;
  const verifyUrl = absoluteUrl(`/academy/verify/${b.serial}`);

  return (
    <div className="space-y-6 print:space-y-0">
      {/* Print rules: hide chrome, landscape page, keep the gold/navy colors. */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          html, body { background: #ffffff !important; }
          main { padding: 0 !important; }
          .cert-sheet { box-shadow: none !important; margin: 0 !important; }
          .cert-sheet, .cert-sheet * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <PageHeader title="Completion certificate" description="Your verifiable record of finishing the Partner Academy." />
        <PrintButton />
      </div>

      <div className="cert-sheet relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white p-1 shadow-md ring-1 ring-gold-500/40 print:max-w-none print:rounded-none print:ring-0">
        {/* Decorative double frame */}
        <div className="rounded-xl border-2 border-gold-500/70 print:rounded-none">
          <div className="rounded-lg border border-navy-200 px-8 py-12 text-center sm:px-14">
            {/* Seal */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navy-900 text-gold-500 ring-4 ring-gold-500/30">
              <Award className="h-8 w-8" aria-hidden="true" />
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-gold-800">TenXPros Partner Academy</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy-900">Certificate of Completion</h1>

            <div className="mx-auto mt-6 h-px w-24 bg-gold-500/60" />

            <p className="mt-6 text-sm uppercase tracking-[0.16em] text-slate-500">This certifies that</p>
            <p className="mt-3 text-4xl font-semibold text-navy-900">{current.partner.displayName}</p>

            <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-slate-600 [text-wrap:balance]">
              has completed the TenXPros Partner Academy, passing every module exam and the comprehensive final exam against the program standard.
            </p>

            <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-md bg-neutral-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Serial</p>
                <p className="mt-0.5 text-sm font-semibold text-navy-900">{b.serial}</p>
              </div>
              <div className="rounded-md bg-neutral-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Year</p>
                <p className="mt-0.5 text-sm font-semibold text-navy-900">{b.year}</p>
              </div>
              <div className="rounded-md bg-neutral-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Awarded</p>
                <p className="mt-0.5 text-sm font-semibold text-navy-900">{b.awardedAt.toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-end justify-between gap-6">
              <div className="text-left">
                <p className="font-serif text-2xl italic leading-none text-navy-900">Mehrdad Naderi</p>
                <div className="mt-1 h-px w-44 bg-navy-300" />
                <p className="mt-1 text-xs text-slate-500">Mehrdad Naderi, Founder &amp; CEO, TenXPros</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Verify at</p>
                <p className="text-xs font-medium text-navy-700">{verifyUrl}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
