import { prisma } from "@/lib/prisma";

export async function verifyBadge(code: string) {
  return prisma.participantBadge.findUnique({
    where: { verificationCode: code },
    include: {
      badge: true,
      user: {
        include: {
          directoryProfile: true,
        },
      },
    },
  });
}
