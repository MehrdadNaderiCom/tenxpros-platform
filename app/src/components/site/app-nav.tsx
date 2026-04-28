"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  BookOpen,
  ClipboardList,
  Compass,
  FileCheck,
  Home,
  LineChart,
  Settings,
  Sparkles,
  Target,
  UserRound,
  Workflow,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/diagnostic", label: "Diagnostic", icon: ClipboardList },
  { href: "/tasks", label: "Task Radar", icon: Workflow },
  { href: "/learning", label: "Learning", icon: BookOpen },
  { href: "/scenarios", label: "Scenarios", icon: Target },
  { href: "/evidence", label: "Evidence Vault", icon: FileCheck },
  { href: "/certificates", label: "Certificates", icon: BadgeCheck },
  { href: "/public-profile", label: "Public Profile", icon: Sparkles },
  { href: "/opportunities", label: "TenXRole", icon: Compass },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppNav({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border bg-card">
      <div className="px-4 py-4 border-b border-border">
        <Logo />
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
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
        <p className="capitalize">{role.toLowerCase()}</p>
        <Link href="/sign-out" className="text-primary hover:underline">Sign out</Link>
      </div>
    </aside>
  );
}

export function MobileAppHeader({ name }: { name: string }) {
  return (
    <header className="md:hidden flex items-center justify-between border-b border-border bg-card px-4 py-3">
      <Logo />
      <div className="flex items-center gap-3 text-sm">
        <LineChart className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground truncate max-w-[120px]">{name}</span>
        <Link href="/sign-out" className="text-primary text-xs">Sign out</Link>
      </div>
    </header>
  );
}
