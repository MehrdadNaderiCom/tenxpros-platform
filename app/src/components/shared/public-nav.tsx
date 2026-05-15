import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

const navItems = [
  ["Program", "/program"],
  ["How it works", "/how-it-works"],
  ["Dossier", "/dossier"],
  ["Certification", "/certification"],
  ["Pricing", "/pricing"],
  ["Directory", "/directory"],
  ["Radar", "/radar"],
  ["About", "/about"],
];

export function PublicNav() {
  return (
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
          <ButtonLink href="/apply" size="sm">
            Apply
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
