import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { PortalShell } from "@/components/portal/portal-shell";
import { getCurrentMember } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MemberPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  return <PortalShell applicantName={member.fullName}>{children}</PortalShell>;
}
