import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PortalNav } from "@/components/shared/portal-nav";

export const dynamic = "force-dynamic";

const portalRoles = ["PARTICIPANT", "COACH", "ADMIN"];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Admins belong in the admin panel, not the participant portal.
  if (session.user.role === "ADMIN") redirect("/admin");
  if (!portalRoles.includes(session.user.role)) redirect("/login");

  return (
    <div className="min-h-screen bg-neutral-50 md:flex">
      <PortalNav name={session.user.name} />
      <main className="w-full px-6 py-8 md:px-8">{children}</main>
    </div>
  );
}
