import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/authz";
import { getPortalPreview } from "@/lib/participant/view";
import { PortalNav } from "@/components/shared/portal-nav";
import { AdminPreviewBanner } from "@/components/shared/admin-preview-banner";

export const dynamic = "force-dynamic";

const portalRoles = ["PARTICIPANT", "COACH"];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // A super admin with an active preview cookie may view a participant's portal
  // read-only; otherwise admins belong in the admin panel.
  const preview = isSuperAdmin(session.user.email) ? await getPortalPreview() : null;
  if (session.user.role === "ADMIN") {
    if (!preview) redirect("/admin");
  } else if (!portalRoles.includes(session.user.role)) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-50 md:flex">
      <PortalNav name={preview ? preview.name : session.user.name} />
      <main className="w-full px-6 py-8 md:px-8">
        {preview ? <AdminPreviewBanner name={preview.name} /> : null}
        {children}
      </main>
    </div>
  );
}
