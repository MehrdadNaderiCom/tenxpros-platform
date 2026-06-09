"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  BookUser,
  ChevronDown,
  CreditCard,
  FileBarChart,
  FolderOpen,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Menu,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Tag,
  UserCog,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = { label: string; href: string };
export type NavSection = { title: string; items: NavItem[] };

const NAV_PANEL_ID = "admin-nav-panel";
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40";

/** One icon per admin destination — keeps the sidebar scannable and professional. */
const ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/applications": Inbox,
  "/admin/participants": GraduationCap,
  "/admin/diagnostics": Activity,
  "/admin/paths": Route,
  "/admin/modules": BookOpen,
  "/admin/dossiers": FolderOpen,
  "/admin/certifications": BadgeCheck,
  "/admin/badges": Award,
  "/admin/directory": BookUser,
  "/admin/tickets": LifeBuoy,
  "/admin/pricing": Tag,
  "/admin/payments": CreditCard,
  "/admin/analytics": BarChart3,
  "/admin/reports": FileBarChart,
  "/admin/audit": ShieldCheck,
  "/admin/users": UserCog,
  "/admin/email": Mail,
  "/admin/settings": Settings,
};

function isActiveHref(pathname: string, href: string): boolean {
  // "/admin" (Dashboard) matches only itself, since every admin route starts with it.
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function sectionPanelId(title: string): string {
  return `admin-nav-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function AdminNavClient({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  // Sections are collapsed by default; the section for the current page starts
  // open so the admin always sees where they are. Click a header to toggle.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of sections) {
      if (section.items.some((item) => isActiveHref(pathname, item.href))) initial[section.title] = true;
    }
    return initial;
  });

  // Keep the active section open as the admin navigates between pages, without
  // collapsing any section they have opened themselves.
  useEffect(() => {
    const active = sections.find((section) => section.items.some((item) => isActiveHref(pathname, item.href)));
    if (active) setExpanded((prev) => (prev[active.title] ? prev : { ...prev, [active.title]: true }));
  }, [pathname, sections]);

  const q = query.trim().toLowerCase();

  const visibleSections = useMemo(() => {
    if (!q) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.label.toLowerCase().includes(q)),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, q]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        aria-expanded={mobileOpen}
        aria-controls={NAV_PANEL_ID}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-slate-700 md:hidden",
          FOCUS_RING,
        )}
      >
        Menu
        {mobileOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
      </button>

      <div id={NAV_PANEL_ID} className={cn("space-y-4", mobileOpen ? "block" : "hidden md:block")}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search admin…"
            aria-label="Search admin navigation"
            className="h-9 w-full rounded-md border border-neutral-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
          />
        </div>

        <nav className="space-y-3">
          {visibleSections.map((section) => {
            const searching = Boolean(q);
            const sectionCollapsed = searching ? false : !expanded[section.title];
            const panelId = sectionPanelId(section.title);
            return (
              <div key={section.title}>
                <button
                  type="button"
                  onClick={() => {
                    if (searching) return; // sections are force-expanded while searching
                    setExpanded((prev) => ({ ...prev, [section.title]: !prev[section.title] }));
                  }}
                  aria-expanded={!sectionCollapsed}
                  aria-controls={panelId}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:text-slate-700",
                    FOCUS_RING,
                  )}
                >
                  {section.title}
                  {!searching ? (
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform", sectionCollapsed && "-rotate-90")}
                      aria-hidden="true"
                    />
                  ) : null}
                </button>

                <div id={panelId} className={cn("mt-0.5 space-y-0.5", sectionCollapsed && "hidden")}>
                  {section.items.map((item) => {
                    const Icon = ICONS[item.href] ?? LayoutDashboard;
                    const active = isActiveHref(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition",
                          FOCUS_RING,
                          active
                            ? "bg-navy-900 font-medium text-white"
                            : "text-slate-700 hover:bg-navy-50 hover:text-navy-900",
                        )}
                      >
                        <Icon
                          className={cn("h-4 w-4 flex-none", active ? "text-white" : "text-slate-400")}
                          aria-hidden="true"
                        />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {visibleSections.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">No matches for “{query}”.</p>
          ) : null}
        </nav>
      </div>
    </div>
  );
}
