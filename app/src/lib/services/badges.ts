import { prisma } from "@/lib/prisma";
import { resolveCredentialValidity, resolvePublicCredentialStatus } from "@/lib/credentials/status";

export async function verifyBadge(code: string) {
  const record = await prisma.participantBadge.findUnique({
    where: { verificationCode: code },
    include: {
      badge: true,
      user: {
        include: {
          directoryProfile: true,
          // The recipient's certification carries the credential field and
          // specialization, shown on the verification surfaces when certified.
          participantProfile: {
            include: {
              certification: { select: { id: true, outcome: true, field: true, specialization: true } },
            },
          },
        },
      },
    },
  });
  if (!record) return null;

  const certification = record.user.participantProfile?.certification ?? null;
  const credentialValidity = resolveCredentialValidity({
    storedStatus: record.status,
    expiresAt: record.expiresAt,
    badgeIsActive: record.badge.isActive,
    badgeCategory: record.badge.category,
    contextRef: record.contextRef,
    certification,
  });
  return {
    ...record,
    credentialValidity,
    credentialStatus: resolvePublicCredentialStatus(credentialValidity, record.isPublic),
  };
}
