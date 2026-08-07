import "server-only";

import type { verifyBadge } from "@/lib/services/badges";
import {
  canExposeCertificationDetails,
  type PublicCredentialStatus,
} from "@/lib/credentials/status";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type VerifiedCredential = NonNullable<Awaited<ReturnType<typeof verifyBadge>>>;

const statusDescriptions: Record<PublicCredentialStatus, string> = {
  ACTIVE: "This credential is current and verified.",
  REVOKED: "This credential has been revoked and is no longer valid.",
  EXPIRED: "This credential has expired and is no longer current.",
  INACTIVE: "This credential is not currently active.",
  PRIVATE: "This credential exists, but its recipient details are private.",
};

export function CredentialVerificationResult({
  record,
  headingLevel = "h2",
}: {
  record: VerifiedCredential;
  headingLevel?: "h1" | "h2";
}) {
  const certification = record.user.participantProfile?.certification;
  const showRecipient = record.isPublic;
  const showCredential = canExposeCertificationDetails({
    credentialStatus: record.credentialStatus,
    isPublic: record.isPublic,
    certificationOutcome: certification?.outcome,
  });
  const Heading = headingLevel;

  return (
    <Card className="space-y-6 text-center" data-testid="credential-verification-result">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">
        TenXPros verification
      </p>
      <Heading className="text-3xl font-semibold text-navy-900">{record.badge.name}</Heading>
      <p className="text-slate-600">{record.badge.description}</p>

      <div
        className="flex flex-col items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-5 py-4"
        role="status"
        aria-label={`Credential status: ${record.credentialStatus}`}
      >
        <Badge status={record.credentialStatus}>{record.credentialStatus}</Badge>
        <p className="text-sm text-slate-600">{statusDescriptions[record.credentialStatus]}</p>
      </div>

      <dl className="grid gap-4 rounded-md bg-neutral-50 p-5 text-left sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recipient</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {showRecipient ? record.user.name ?? "TenXPro" : "Private"}
          </dd>
        </div>
        {showCredential && certification?.field ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Field</dt>
            <dd className="mt-1 font-medium text-slate-900">{certification.field}</dd>
          </div>
        ) : null}
        {showCredential && certification?.specialization ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Specialization</dt>
            <dd className="mt-1 font-medium text-slate-900">{certification.specialization}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Earned</dt>
          <dd className="mt-1 font-medium text-slate-900">{record.earnedAt.toLocaleDateString()}</dd>
        </div>
        {record.expiresAt ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expires</dt>
            <dd className="mt-1 font-medium text-slate-900">{record.expiresAt.toLocaleDateString()}</dd>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Verification code
          </dt>
          <dd className="mt-1 break-all font-mono text-sm font-medium text-slate-900">
            {record.verificationCode}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

export function InvalidCredentialResult() {
  return (
    <Card
      className="space-y-3 border-neutral-300 bg-neutral-50 text-center"
      data-testid="credential-verification-invalid"
      role="status"
    >
      <Badge status="INACTIVE">INVALID</Badge>
      <h2 className="text-xl font-semibold text-navy-900">Credential not verified</h2>
      <p className="mx-auto max-w-xl text-sm leading-6 text-slate-600">
        We could not verify that code. Check the code exactly as it appears on the credential and try
        again.
      </p>
    </Card>
  );
}
