import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/authz";
import { getPortalPreview } from "@/lib/participant/view";

const portalRoles = ["PARTICIPANT", "COACH"];

/** Re-runs the DB-fresh role gate on every client navigation. */
export default async function PortalAuthorizationTemplate({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const preview = isSuperAdmin(session.user.email) ? await getPortalPreview() : null;
  if (session.user.role === "ADMIN") {
    if (!preview) redirect("/admin");
  } else if (!portalRoles.includes(session.user.role)) {
    redirect("/login");
  }
  return children;
}
