import { redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/partner/auth";

/** Re-check current user, role, partner link and partner status on navigation. */
export default async function PartnerAuthorizationTemplate({ children }: { children: React.ReactNode }) {
  const current = await getCurrentPartner();
  if (!current) redirect("/login");
  return children;
}
