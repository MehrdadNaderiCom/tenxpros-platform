import { NextResponse } from "next/server";
import { verifyBadge } from "@/lib/services/badges";
import { canExposeCertificationDetails } from "@/lib/credentials/status";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { code: string } }) {
  const record = await verifyBadge(params.code);
  if (!record) return NextResponse.json({ ok: false, error: "Badge not found" }, { status: 404 });
  const certification = record.user.participantProfile?.certification;
  const showRecipient = record.isPublic;
  const showCredential = canExposeCertificationDetails({
    credentialStatus: record.credentialStatus,
    isPublic: record.isPublic,
    certificationOutcome: certification?.outcome,
  });
  // Directory identity is part of the certification claim. Even if a stale or
  // adversarial write flips DirectoryProfile.isPublic back on after downgrade,
  // the verification response must stay governed by current credential state.
  const showDirectory = showCredential && record.user.directoryProfile?.isPublic;
  return NextResponse.json({
    ok: true,
    badge: {
      name: record.badge.name,
      description: record.badge.description,
      category: record.badge.category,
    },
    recipient: {
      name: showRecipient ? record.user.name : null,
      publicTitle: showDirectory ? record.user.directoryProfile?.title ?? null : null,
      directorySlug: showDirectory ? record.user.directoryProfile?.slug ?? null : null,
      // Kept in sync with the verification page: field and specialization,
      // present only for a certified recipient with a public badge.
      field: showCredential ? certification?.field ?? null : null,
      specialization: showCredential ? certification?.specialization ?? null : null,
    },
    earnedAt: record.earnedAt,
    status: record.credentialStatus,
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt,
  });
}
