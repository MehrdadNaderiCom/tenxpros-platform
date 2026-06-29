import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { FooterTermsLink } from "@/components/shared/footer-terms-link";

const links = [
  ["The Method", "/program"],
  ["The Dossier", "/dossier"],
  ["How it works", "/how-it-works"],
  ["Certification", "/certification"],
  ["Pricing", "/pricing"],
  ["Become a Partner", "/partners"],
  ["Support", "/support"],
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
            You bring the expertise. We bring the AI method. TenXPros helps serious professionals build reviewed AI adoption work they can defend.
          </p>
          <p className="text-sm text-slate-600">
            Technical support:{" "}
            <a href="mailto:support@tenxpros.com" className="font-medium text-navy-900 hover:underline">
              support@tenxpros.com
            </a>
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
          {links.map(([label, href]) =>
            label === "Terms" ? (
              <FooterTermsLink key="terms" className="hover:text-navy-900" />
            ) : (
              <Link key={href} href={href} className="hover:text-navy-900">
                {label}
              </Link>
            ),
          )}
        </nav>
      </div>
      <div className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-sm text-slate-600 md:flex-row md:items-center md:justify-between md:px-8">
          <p>
            <span className="font-medium text-navy-900">Terms and rules updates.</span>{" "}
            Our terms and rules are reviewed each calendar year and any changes are announced on the site.
          </p>
          <Link href="/terms/updates" className="font-medium text-navy-900 hover:underline">
            See what changed and the archive
          </Link>
        </div>
      </div>
    </footer>
  );
}
