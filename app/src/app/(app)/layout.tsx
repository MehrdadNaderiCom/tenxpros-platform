import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppNav, MobileAppHeader } from "@/components/site/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role === "EMPLOYER") redirect("/employer/dashboard");
  if (user.role === "ADMIN") redirect("/admin");

  return (
    <div className="flex min-h-screen bg-background">
      <AppNav name={user.name ?? user.email} role={user.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileAppHeader name={user.name ?? user.email} />
        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
