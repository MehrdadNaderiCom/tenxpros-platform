import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/shared/print-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const review = await prisma.certificationReview.findUnique({
    where: { id: params.id },
    include: { participant: { include: { user: true } } },
  });
  return {
    title: review?.outcome === "CERTIFIED" ? "Certified TenXPro Certificate" : "Certificate",
    description: review?.participant.user.name
      ? `TenXPros certificate for ${review.participant.user.name}.`
      : "TenXPros certificate.",
  };
}

export default async function CertificatePage({ params }: { params: { id: string } }) {
  const review = await prisma.certificationReview.findUnique({
    where: { id: params.id },
    include: {
      participant: {
        include: {
          user: { include: { earnedBadges: { include: { badge: true }, orderBy: { earnedAt: "desc" } } } },
        },
      },
    },
  });

  if (!review || review.outcome !== "CERTIFIED") notFound();

  const capstoneBadge = review.participant.user.earnedBadges.find(
    (item) => item.badge.slug === "capstone-certified-tenxpro-seal",
  );
  const participantName = review.participant.user.name ?? review.participant.user.email;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 print:max-w-none print:px-0">
      <div className="mb-6 flex justify-end">
        <PrintButton label="Print certificate" />
      </div>
      <Card className="space-y-10 border-gold-500 bg-white p-10 text-center print:border-0 print:shadow-none">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gold-700">TenXPros</p>
          <h1 className="text-4xl font-semibold text-navy-900">Certified TenXPro</h1>
          <Badge status="CERTIFIED">CERTIFIED</Badge>
        </div>

        <div className="space-y-3">
          <p className="text-sm uppercase tracking-wide text-slate-500">Awarded to</p>
          <p className="text-3xl font-semibold text-navy-900">{participantName}</p>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-slate-600">
            For meeting the TenXPros capstone standard through a reviewed Living AI Solution Dossier,
            responsible AI adoption evidence, and professional certification judgment.
          </p>
        </div>

        {review.field || review.specialization ? (
          <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
            {review.field ? (
              <div className="rounded-md border border-gold-500 bg-gold-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">Field</p>
                <p className="mt-2 text-lg font-semibold text-navy-900">{review.field}</p>
              </div>
            ) : null}
            {review.specialization ? (
              <div className="rounded-md border border-gold-500 bg-gold-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">Specialization</p>
                <p className="mt-2 text-lg font-semibold text-navy-900">{review.specialization}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 text-left md:grid-cols-3">
          <div className="rounded-md border border-neutral-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Certification date</p>
            <p className="mt-2 font-medium text-navy-900">{review.reviewedAt.toLocaleDateString()}</p>
          </div>
          <div className="rounded-md border border-neutral-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Credential</p>
            <p className="mt-2 font-medium text-navy-900">Certified TenXPro Capstone Seal</p>
          </div>
          <div className="rounded-md border border-neutral-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Verification</p>
            <p className="mt-2 break-all font-medium text-navy-900">
              {capstoneBadge ? `/verify/${capstoneBadge.verificationCode}` : "Pending badge reference"}
            </p>
          </div>
        </div>
      </Card>
    </main>
  );
}
