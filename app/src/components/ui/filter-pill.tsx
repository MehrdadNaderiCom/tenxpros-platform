import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A filter / tab pill link. One consistent treatment for the active and inactive
 * states, used by every list filter row in the admin.
 */
export function FilterPill({ label, href, active }: { label: ReactNode; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold transition",
        active ? "bg-navy-900 text-white" : "border border-neutral-300 text-slate-600 hover:bg-neutral-50",
      )}
    >
      {label}
    </Link>
  );
}
