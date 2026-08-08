import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifyBadge } from "@/lib/services/badges";
import { CredentialVerificationResult } from "@/components/credentials/credential-verification-result";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const record = await verifyBadge(params.code);
  // Resolve absence before the route starts streaming. A notFound() thrown only
  // from the page body can render the correct UI after HTTP 200 is committed.
  if (!record) notFound();
  return {
    title: `${record.badge.name} Verification`,
    description:
      record.isPublic
        ? `Verify ${record.badge.name} for ${record.user.name ?? "TenXPro"}.`
        : "Verify a TenXPros badge.",
  };
}

export default async function VerifyBadgePage({ params }: { params: { code: string } }) {
  const record = await verifyBadge(params.code);
  if (!record) notFound();
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:px-8 md:py-24">
      <CredentialVerificationResult record={record} headingLevel="h1" />
    </main>
  );
}
