import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify a Partner Academy credential" };

/**
 * Public verification of a Partner Academy badge. Confirms the serial, a holder
 * reference, the award date, and the year. It never exposes exam content,
 * answers, or any private submission.
 */
export default async function VerifyPage({ params }: { params: { serial: string } }) {
  const badge = await prisma.partnerAcademyBadge.findUnique({
    where: { serial: params.serial },
    include: { partner: { select: { displayName: true } } },
  });

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-xl px-6 py-16 md:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">TenXPros Partner Academy</p>
        <h1 className="mt-3 text-3xl font-semibold text-navy-900">Credential verification</h1>
        {badge ? (
          <Card className="mt-6 space-y-4 border-emerald-200">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">Verified credential</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Holder</dt>
                <dd className="mt-1 font-medium text-navy-900">{badge.partner?.displayName ?? "TenXPros partner"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Serial</dt>
                <dd className="mt-1 font-medium text-navy-900">{badge.serial}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Awarded</dt>
                <dd className="mt-1 font-medium text-navy-900">{badge.awardedAt.toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Year</dt>
                <dd className="mt-1 font-medium text-navy-900">{badge.year}</dd>
              </div>
            </dl>
            <p className="text-xs text-slate-500">
              This confirms completion of the TenXPros Partner Academy. It does not expose any exam content or private work.
            </p>
          </Card>
        ) : (
          <Card className="mt-6">
            <p className="text-sm text-slate-600">No Partner Academy credential matches the serial {params.serial}.</p>
          </Card>
        )}
      </div>
    </main>
  );
}
