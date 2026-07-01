import { prisma } from "@/lib/prisma";

export async function verifyBadge(code: string) {
  return prisma.participantBadge.findUnique({
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
              certification: { select: { outcome: true, field: true, specialization: true } },
            },
          },
        },
      },
    },
  });
}
