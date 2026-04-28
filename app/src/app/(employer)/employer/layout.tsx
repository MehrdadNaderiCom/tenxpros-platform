import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { EmployerNav } from "@/components/site/employer-nav";

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "EMPLOYER") redirect("/dashboard");
  const org = await prisma.organizationProfile.findUnique({ where: { userId: user.id } });
  if (!org) redirect("/employer/organization");

  return (
    <div className="flex min-h-screen bg-background">
      <EmployerNav orgName={org.name} />
      <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto">{children}</main>
    </div>
  );
}
