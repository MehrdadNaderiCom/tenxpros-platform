"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The footer "Terms" link. On Partner Program routes it points to the Partner
 * Program Terms, so a partner visitor always lands on the partner terms; on every
 * other route it points to the general site terms.
 */
export function FooterTermsLink({ className }: { className?: string }) {
  const pathname = usePathname();
  const href = pathname?.startsWith("/partners") ? "/partners/terms" : "/terms";
  return (
    <Link href={href} className={className}>
      Terms
    </Link>
  );
}
