"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

// Primary nav labels aligned to the locked positioning. Routes are unchanged
// (e.g. "The Method" still points at /program) so no routes break.
const navItems: Array<[string, string]> = [
  ["The Method", "/program"],
  ["The Dossier", "/dossier"],
  ["Certification", "/certification"],
  ["Pricing", "/pricing"],
  ["Partners", "/partners"],
  ["About", "/about"],
];

// Standardized cool-indigo action accent for the primary CTA (matches the
// Instrument page CTAs). Gold stays reserved for credential/seal moments.
const CTA_ACCENT = "bg-indigo-500 text-white hover:bg-indigo-400 focus:ring-indigo-400";

export function PublicNav() {
  const [open, setOpen] = useState(false);

  // Lock body scroll and allow Escape-to-close while the mobile menu is open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 md:px-8">
        <Logo />

        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-700 lg:flex">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-navy-900">
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm font-medium text-navy-900 sm:inline">
            Login
          </Link>

          {/* Desktop CTA (full label) */}
          <ButtonLink href="/apply" size="sm" className={cn("hidden lg:inline-flex", CTA_ACCENT)}>
            Apply for Founding Charter
          </ButtonLink>

          {/* Mobile CTA (compact) + hamburger */}
          <ButtonLink href="/apply" size="sm" className={cn("lg:hidden", CTA_ACCENT)}>
            Apply
          </ButtonLink>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 text-navy-900 transition hover:bg-navy-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile menu, rendered outside <header> so the header's
          backdrop-blur (a containing block for fixed elements) doesn't trap it. */}
      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-6 py-4">
            <Logo />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 text-navy-900 transition hover:bg-navy-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-6 py-6">
            {navItems.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="border-b border-neutral-100 py-3.5 text-lg font-medium text-navy-900 transition hover:text-navy-700"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/how-it-works"
              onClick={() => setOpen(false)}
              className="border-b border-neutral-100 py-3.5 text-lg font-medium text-navy-900 transition hover:text-navy-700"
            >
              How it works
            </Link>
            <Link
              href="/support"
              onClick={() => setOpen(false)}
              className="border-b border-neutral-100 py-3.5 text-lg font-medium text-navy-900 transition hover:text-navy-700"
            >
              Support
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="py-3.5 text-lg font-medium text-navy-900 transition hover:text-navy-700"
            >
              Login
            </Link>
          </nav>

          <div className="border-t border-neutral-200 px-6 py-5">
            <ButtonLink
              href="/apply"
              size="lg"
              onClick={() => setOpen(false)}
              className={cn("w-full", CTA_ACCENT)}
            >
              Apply for Founding Charter
            </ButtonLink>
          </div>
        </div>
      ) : null}
    </>
  );
}
