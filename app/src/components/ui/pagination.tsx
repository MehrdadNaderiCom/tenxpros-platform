import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Server-friendly pagination. Renders Prev / "Page X of Y" / Next as links built
 * from a base href + page query param. Hides itself when there is a single page.
 */
export function Pagination({
  page,
  totalPages,
  hrefForPage,
  className,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  const linkClass = "inline-flex h-9 items-center rounded-md border border-neutral-300 px-3 text-sm font-medium text-slate-600 transition hover:bg-neutral-50";
  const disabledClass = "pointer-events-none opacity-40";
  return (
    <nav className={cn("flex items-center justify-between gap-3", className)} aria-label="Pagination">
      <Link href={hrefForPage(prev)} className={cn(linkClass, page <= 1 && disabledClass)} aria-disabled={page <= 1}>
        Previous
      </Link>
      <span className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </span>
      <Link href={hrefForPage(next)} className={cn(linkClass, page >= totalPages && disabledClass)} aria-disabled={page >= totalPages}>
        Next
      </Link>
    </nav>
  );
}
