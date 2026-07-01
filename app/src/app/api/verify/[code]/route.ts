import { NextResponse } from "next/server";
import { verifyBadge } from "@/lib/services/badges";

export async function GET(_request: Request, { params }: { params: { code: string } }) {
  const record = await verifyBadge(params.code);
  if (!record) return NextResponse.json({ ok: false, error: "Badge not found" }, { status: 404 });
  const certification = record.user.participantProfile?.certification;
  // Only a certified recipient with a public badge exposes credential details.
  const showCredential = certification?.outcome === "CERTIFIED" && record.isPublic;
  return NextResponse.json({
    ok: true,
    badge: {
      name: record.badge.name,
      description: record.badge.description,
      category: record.badge.category,
    },
    recipient: {
      name: record.user.name,
      publicTitle: record.user.directoryProfile?.title,
      directorySlug: record.user.directoryProfile?.isPublic ? record.user.directoryProfile.slug : null,
      // Kept in sync with the verification page: field and specialization,
      // present only for a certified recipient with a public badge.
      field: showCredential ? certification?.field ?? null : null,
      specialization: showCredential ? certification?.specialization ?? null : null,
    },
    earnedAt: record.earnedAt,
    status: record.isPublic ? "ACTIVE" : "INACTIVE",
  });
}
