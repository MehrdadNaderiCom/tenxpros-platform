"use client";

import {
  Award,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Files,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { logoutAction } from "@/actions/auth";

const navigation = [
  { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
  { href: "/admin/applications", label: "درخواست‌ها", icon: ClipboardList },
  { href: "/admin/payments", label: "پرداخت‌ها", icon: ReceiptText },
  { href: "/admin/diagnostics", label: "Diagnostic Review", icon: ClipboardCheck },
  { href: "/admin/dossiers", label: "Dossier Review", icon: Files },
  { href: "/admin/certifications", label: "Credentials", icon: Award },
  { href: "/admin/slots", label: "زمان‌های آزاد", icon: CalendarRange },
  { href: "/admin/bookings", label: "رزروها", icon: CalendarDays },
  { href: "/admin/gatherings", label: "AI Roundtable", icon: MessageSquareText },
  { href: "/admin/coaching", label: "Coaching", icon: Sparkles },
];

export function AdminShell({
  adminName,
  children,
}: {
  adminName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-[1680px] lg:grid-cols-[18rem_1fr]">
        <aside className="hidden border-l border-slate-200 bg-white p-5 lg:flex lg:flex-col">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-4">
            <span className="grid size-10 place-items-center rounded-lg bg-slate-950 font-black text-white">
              X
            </span>
            <span>
              <span className="block font-black">TenXPros Iran</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-iris-600">
                Admin Console
              </span>
            </span>
          </Link>

          <nav
            className="mt-7 min-h-0 flex-1 space-y-1.5 overflow-y-auto"
            aria-label="منوی مدیریت"
          >
            {navigation.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/admin" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-4 py-2 text-sm font-bold transition ${
                    active
                      ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 rounded-lg bg-slate-100 p-4">
            <p className="truncate text-sm font-black">{adminName}</p>
            <p className="mt-1 text-xs text-slate-500">دسترسی مدیریت</p>
            <form action={logoutAction} className="mt-4">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:text-rose-700"
              >
                <LogOut className="size-4" />
                خروج امن
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between">
              <Link href="/admin" className="font-black">
                TenXPros <span className="text-iris-600">Admin</span>
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  aria-label="خروج از پنل مدیریت"
                  className="grid size-10 place-items-center rounded-lg border border-slate-200"
                >
                  <LogOut className="size-4" />
                </button>
              </form>
            </div>
            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="منوی مدیریت">
              {navigation.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${
                    href === "/admin"
                      ? pathname === href
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600"
                      : pathname.startsWith(href)
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {label}
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
