import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Employer settings" };

export default async function EmployerSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "EMPLOYER") redirect("/sign-in");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <Card><CardContent className="p-6 space-y-2 text-sm">
        <Row label="Contact" value={user.email} />
        <Row label="Role" value={user.role} />
      </CardContent></Card>
      <Card><CardContent className="p-6 space-y-3">
        <p className="font-semibold">Organisation</p>
        <p className="text-sm text-muted-foreground">Manage your organisation profile from <Link href="/employer/organization" className="text-primary">Organisation</Link>.</p>
      </CardContent></Card>
      <Card><CardContent className="p-6 space-y-3">
        <p className="font-semibold">Sign out</p>
        <p className="text-sm text-muted-foreground"><Link href="/sign-out" className="text-primary">Sign out of TenXPros</Link></p>
      </CardContent></Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border last:border-0 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium truncate ml-4">{value}</span>
    </div>
  );
}
