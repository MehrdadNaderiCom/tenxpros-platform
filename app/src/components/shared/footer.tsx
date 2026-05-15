import Link from "next/link";
import { Logo } from "@/components/shared/logo";

const links = [
  ["Program", "/program"],
  ["Dossier", "/dossier"],
  ["Certification", "/certification"],
  ["Pricing", "/pricing"],
  ["Terms", "/terms"],
  ["Privacy", "/privacy"],
  ["Refund", "/refund"],
];

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-xl text-sm text-slate-600">
            A selective AI adoption program for professionals who need practical,
            responsible, evidence-based capability.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-navy-900">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
