"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  Gauge,
  Search,
  Send,
  Settings,
  UsersRound,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/employer/dashboard", label: "Overview", icon: Gauge },
  { href: "/employer/roles", label: "Role needs", icon: ClipboardList },
  { href: "/employer/roles/new", label: "Post a role", icon: Send },
  { href: "/employer/browse", label: "Browse professionals", icon: Search },
  { href: "/employer/matches", label: "Matches", icon: UsersRound },
  { href: "/employer/organization", label: "Organisation", icon: Building2 },
  { href: "/employer/settings", label: "Settings", icon: Settings },
];

export function EmployerNav({ orgName }: { orgName: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border bg-card">
      <div className="px-4 py-4 border-b border-border flex items-center justify-between">
        <Logo />
        <span className="text-[10px] uppercase tracking-wider text-primary">employer</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/employer/dashboard" && pathname?.startsWith(`${item.href}`));
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
        <p className="font-medium text-foreground truncate">{orgName}</p>
        <Link href="/sign-out" className="text-primary hover:underline">Sign out</Link>
      </div>
    </aside>
  );
}
