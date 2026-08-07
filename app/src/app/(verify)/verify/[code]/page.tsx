import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifyBadge } from "@/lib/services/badges";
import { canExposeCertificationDetails } from "@/lib/credentials/status";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const record = await verifyBadge(params.code);
  return {
    title: record ? `${record.badge.name} Verification` : "Badge Verification",
    description:
      record && record.isPublic
        ? `Verify ${record.badge.name} for ${record.user.name ?? "TenXPro"}.`
        : "Verify a TenXPros badge.",
  };
}

export default async function VerifyBadgePage({ params }: { params: { code: string } }) {
  const record = await verifyBadge(params.code);
  if (!record) notFound();
  const certification = record.user.participantProfile?.certification;
  const showRecipient = record.isPublic;
  const showCredential = canExposeCertificationDetails({
    credentialStatus: record.credentialStatus,
    isPublic: record.isPublic,
    certificationOutcome: certification?.outcome,
  });
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:px-8 md:py-24">
      <Card className="space-y-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">TenXPros verification</p>
        <h1 className="text-3xl font-semibold text-navy-900">{record.badge.name}</h1>
        <p className="text-slate-600">{record.badge.description}</p>
        <div className="grid gap-4 rounded-md bg-neutral-50 p-5 text-left">
          <p>
            <span className="font-medium text-slate-900">Recipient:</span>{" "}
            {showRecipient ? record.user.name ?? "TenXPro" : "Private"}
          </p>
          {showCredential && certification?.field ? (
            <p><span className="font-medium text-slate-900">Field:</span> {certification.field}</p>
          ) : null}
          {showCredential && certification?.specialization ? (
            <p><span className="font-medium text-slate-900">Specialization:</span> {certification.specialization}</p>
          ) : null}
          <p><span className="font-medium text-slate-900">Earned:</span> {record.earnedAt.toLocaleDateString()}</p>
          {record.expiresAt ? (
            <p><span className="font-medium text-slate-900">Expires:</span> {record.expiresAt.toLocaleDateString()}</p>
          ) : null}
          <p><span className="font-medium text-slate-900">Verification code:</span> {record.verificationCode}</p>
          <p><span className="font-medium text-slate-900">Status:</span> <Badge status={record.credentialStatus}>{record.credentialStatus}</Badge></p>
        </div>
      </Card>
    </main>
  );
}
