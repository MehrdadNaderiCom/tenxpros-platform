import Link from "next/link";
import { signOut } from "@/lib/auth";
import { Logo } from "@/components/shared/logo";
import { Badge } from "@/components/ui/badge";

const adminItems = [
  ["Dashboard", "/admin"],
  ["Applications", "/admin/applications"],
  ["Participants", "/admin/participants"],
  ["Diagnostics", "/admin/diagnostics"],
  ["Paths", "/admin/paths"],
  ["Modules", "/admin/modules"],
  ["Dossiers", "/admin/dossiers"],
  ["Tickets", "/admin/tickets"],
  ["Certifications", "/admin/certifications"],
  ["Directory", "/admin/directory"],
  ["Pricing", "/admin/pricing"],
  ["Payments", "/admin/payments"],
  ["Analytics", "/admin/analytics"],
  ["Badges", "/admin/badges"],
  ["Users", "/admin/users"],
  ["Email", "/admin/email"],
  ["Audit", "/admin/audit"],
  ["Reports", "/admin/reports"],
  ["Settings", "/admin/settings"],
];

export function AdminNav({ name }: { name?: string | null }) {
  return (
    <aside className="border-b border-neutral-200 bg-white p-5 md:min-h-screen md:w-72 md:border-b-0 md:border-r">
      <div className="space-y-6">
        <Logo />
        <div className="space-y-2">
          <Badge status="ENROLLED">ADMIN</Badge>
          <p className="font-medium text-slate-900">{name ?? "Admin"}</p>
          <p className="text-xs text-slate-500">Environment: {process.env.NODE_ENV}</p>
        </div>
        <nav className="grid gap-1 text-sm">
          {adminItems.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-slate-700 hover:bg-navy-50 hover:text-navy-900"
            >
              {label}
            </Link>
          ))}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="text-sm font-medium text-slate-600 hover:text-navy-900" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
