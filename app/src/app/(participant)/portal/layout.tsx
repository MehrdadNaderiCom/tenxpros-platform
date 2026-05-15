import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PortalNav } from "@/components/shared/portal-nav";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-neutral-50 md:flex">
      <PortalNav name={session.user.name} />
      <main className="w-full px-6 py-8 md:px-8">{children}</main>
    </div>
  );
}
