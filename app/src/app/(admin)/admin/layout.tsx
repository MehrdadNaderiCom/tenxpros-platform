import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminNav } from "@/components/shared/admin-nav";
import { FreshAuthorizationBoundary } from "@/components/auth/fresh-authorization-boundary";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") notFound();

  return (
    <FreshAuthorizationBoundary surface="admin">
      <div className="min-h-screen bg-neutral-50 md:flex">
        <AdminNav name={session.user.name} email={session.user.email} />
        <main className="w-full px-6 py-8 md:px-8">{children}</main>
      </div>
    </FreshAuthorizationBoundary>
  );
}
