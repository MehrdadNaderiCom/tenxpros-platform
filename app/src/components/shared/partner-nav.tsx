import Link from "next/link";
import { signOut } from "@/lib/auth";
import { Logo } from "@/components/shared/logo";
import { Badge } from "@/components/ui/badge";
import { PARTNER_STATUS_LABELS } from "@/lib/partner/constants";
import type { PartnerStatus } from "@prisma/client";

const partnerItems: Array<[string, string]> = [
  ["Dashboard", "/partner"],
  ["Notifications", "/partner/notifications"],
  ["Academy", "/partner/academy"],
  ["Onboarding", "/partner/onboarding"],
  ["Deal Registrations", "/partner/deals"],
  ["My Accounts", "/partner/accounts"],
  ["Special Requests", "/partner/special-deals"],
  ["Partner Toolkit", "/partner/toolkit"],
  ["Experience Sharing", "/partner/discussions"],
  ["Commissions", "/partner/commissions"],
  ["TenXOps", "/partner/tenxops"],
  ["Support", "/partner/support"],
  ["Profile", "/partner/profile"],
];

export function PartnerNav({ name, status, unread = 0 }: { name?: string | null; status?: PartnerStatus; unread?: number }) {
  return (
    <aside className="border-b border-neutral-200 bg-white p-5 md:min-h-screen md:w-72 md:shrink-0 md:border-b-0 md:border-r print:hidden">
      <div className="space-y-6">
        <Logo />
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Partner Panel</p>
          <p className="font-medium text-slate-900">{name ?? "Partner"}</p>
          {status ? <Badge status={status === "TERMINATED" ? "NOT_COMPLETED" : "ACTIVE"}>{PARTNER_STATUS_LABELS[status]}</Badge> : null}
        </div>
        <nav className="grid gap-1 text-sm">
          {partnerItems.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className="flex items-center justify-between rounded-md px-3 py-2 text-slate-700 hover:bg-navy-50 hover:text-navy-900"
            >
              <span>{label}</span>
              {href === "/partner/notifications" && unread > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-navy-900 px-1.5 text-xs font-semibold text-white">
                  {unread}
                </span>
              ) : href === "/partner/toolkit" ? (
                <span className="inline-flex h-5 items-center justify-center rounded-full bg-gold-100 px-2 text-[10px] font-semibold uppercase tracking-wide text-gold-800">
                  New
                </span>
              ) : null}
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
