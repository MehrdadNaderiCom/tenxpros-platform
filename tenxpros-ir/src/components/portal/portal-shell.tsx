"use client";

import {
  Award,
  BookOpenCheck,
  CalendarClock,
  CircleUserRound,
  ClipboardCheck,
  Files,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { logoutAction } from "@/actions/auth";

const navigation = [
  { href: "/portal", label: "نمای کلی", icon: LayoutDashboard },
  { href: "/portal/diagnostic", label: "Diagnostic", icon: ClipboardCheck },
  { href: "/portal/program", label: "TenX Method", icon: BookOpenCheck },
  { href: "/portal/dossier", label: "Dossier", icon: Files },
  { href: "/portal/certification", label: "Certification", icon: Award },
  { href: "/portal/office-hours", label: "Office Hour", icon: CalendarClock },
  { href: "/portal/gathering", label: "AI Roundtable", icon: MessageSquareText },
  { href: "/portal/coaching", label: "Coaching", icon: Sparkles },
];

function PortalLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-11 items-center gap-3 rounded-lg px-4 py-2 text-sm font-bold transition ${
        active
          ? "bg-iris-500 text-white shadow-lg shadow-iris-500/15"
          : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export function PortalShell({
  applicantName,
  children,
}: {
  applicantName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-ink-950 text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[17rem_1fr]">
        <aside className="hidden border-l border-white/10 bg-ink-900/80 p-5 lg:flex lg:flex-col">
          <Link href="/" className="flex items-center gap-3 px-3 py-4">
            <span className="grid size-10 place-items-center rounded-lg bg-gradient-to-br from-iris-400 to-iris-600 font-black text-white">
              X
            </span>
            <span>
              <span className="block text-base font-black tracking-tight text-white">
                TenXPros
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-credential">
                Iran Member Portal
              </span>
            </span>
          </Link>

          <nav
            className="mt-7 min-h-0 flex-1 space-y-2 overflow-y-auto"
            aria-label="منوی پنل اعضا"
          >
            {navigation.map((item) => (
              <PortalLink
                key={item.href}
                {...item}
                active={
                  item.href === "/portal"
                    ? pathname === item.href
                    : pathname.startsWith(item.href)
                }
              />
            ))}
          </nav>

          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <CircleUserRound className="size-8 text-iris-300" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">{applicantName}</p>
                <p className="mt-1 text-xs text-slate-500">عضو TenXPros Iran</p>
              </div>
            </div>
            <form action={logoutAction} className="mt-4">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-rose-300/30 hover:text-rose-200"
              >
                <LogOut className="size-4" />
                خروج امن
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/90 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between">
              <Link href="/portal" className="font-black text-white">
                TenXPros <span className="text-credential">Iran</span>
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="grid size-10 place-items-center rounded-lg border border-white/10 text-slate-300"
                  aria-label="خروج از پنل"
                >
                  <LogOut className="size-4" />
                </button>
              </form>
            </div>
            <nav
              className="mt-3 flex gap-2 overflow-x-auto pb-1"
              aria-label="منوی موبایل پنل اعضا"
            >
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${
                    item.href === "/portal"
                      ? pathname === item.href
                        ? "bg-iris-500 text-white"
                        : "bg-white/5 text-slate-400"
                      : pathname.startsWith(item.href)
                        ? "bg-iris-500 text-white"
                        : "bg-white/5 text-slate-400"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="px-4 py-7 sm:px-7 lg:px-10 lg:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
