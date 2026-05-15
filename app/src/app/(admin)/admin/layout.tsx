import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminNav } from "@/components/shared/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") notFound();

  return (
    <div className="min-h-screen bg-neutral-50 md:flex">
      <AdminNav name={session.user.name} />
      <main className="w-full px-6 py-8 md:px-8">{children}</main>
    </div>
  );
}
