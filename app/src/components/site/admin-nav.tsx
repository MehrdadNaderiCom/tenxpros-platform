"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  BookOpen,
  Building2,
  ClipboardList,
  FileCheck,
  Gauge,
  ListChecks,
  Network,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/users", label: "Professionals", icon: UsersRound },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/learning", label: "Learning", icon: BookOpen },
  { href: "/admin/scenarios", label: "Scenarios", icon: Target },
  { href: "/admin/rubrics", label: "Rubrics", icon: ListChecks },
  { href: "/admin/evidence", label: "Evidence", icon: FileCheck },
  { href: "/admin/certifications", label: "Certifications", icon: BadgeCheck },
  { href: "/admin/employer-requests", label: "Employer requests", icon: ClipboardList },
  { href: "/admin/matches", label: "Matches", icon: Network },
  { href: "/admin/ai-runs", label: "AI runs", icon: Sparkles },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/docs", label: "Docs", icon: ShieldCheck },
];

export function AdminNav({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border bg-card">
      <div className="px-4 py-4 border-b border-border flex items-center justify-between">
        <Logo />
        <span className="text-[10px] uppercase tracking-wider text-accent">admin</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(`${item.href}`));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-border p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground truncate">{name}</p>
        <Link href="/sign-out" className="text-primary hover:underline">Sign out</Link>
      </div>
    </aside>
  );
}
