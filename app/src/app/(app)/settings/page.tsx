import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <header>
        <Badge tone="primary"><Settings className="h-3 w-3" /> Settings</Badge>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">Account</h1>
      </header>

      <Card>
        <CardContent className="p-6 space-y-2 text-sm">
          <Row label="Name" value={user.name ?? "—"} />
          <Row label="Email" value={user.email} />
          <Row label="Role" value={user.role} />
          <Row label="Last login" value={user.lastLoginAt?.toLocaleString() ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <p className="font-semibold">Visibility</p>
          <p className="text-sm text-muted-foreground">Manage what employers and the public see from <Link href="/profile" className="text-primary">your profile</Link> and <Link href="/public-profile" className="text-primary">public profile</Link>.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <p className="font-semibold">Sign out</p>
          <p className="text-sm text-muted-foreground"><Link href="/sign-out" className="text-primary">Sign out of TenXPros</Link></p>
        </CardContent>
      </Card>
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
