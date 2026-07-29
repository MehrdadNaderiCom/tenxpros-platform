import "server-only";

import { redirect } from "next/navigation";

import { requireCurrentMember } from "@/lib/auth";
import { isLearningMemberStatus } from "@/lib/learning";

export async function requireLearningMember() {
  const member = await requireCurrentMember();
  if (!isLearningMemberStatus(member.membershipStatus)) {
    redirect("/portal");
  }
  return member;
}
