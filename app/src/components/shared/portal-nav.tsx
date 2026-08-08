import Link from "next/link";
import { signOut } from "@/lib/auth";
import { Logo } from "@/components/shared/logo";

const portalItems = [
  ["Dashboard", "/portal"],
  ["Starter Pack", "/portal/starter-pack"],
  ["Diagnostic", "/portal/diagnostic"],
  ["Path", "/portal/path"],
  ["Modules", "/portal/modules"],
  ["Dossier", "/portal/dossier"],
  ["Tickets", "/portal/tickets"],
  ["Certification", "/portal/certification"],
  ["Profile", "/portal/profile"],
];

export function PortalNav({ name }: { name?: string | null }) {
  return (
    <aside className="border-b border-neutral-200 bg-white p-5 md:min-h-screen md:w-72 md:border-b-0 md:border-r">
      <div className="space-y-6">
        <Logo />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Participant
          </p>
          <p className="mt-1 font-medium text-slate-900">{name ?? "TenXPro"}</p>
        </div>
        <nav className="grid gap-1 text-sm">
          {portalItems.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
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
