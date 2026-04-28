import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="container py-12 grid gap-10 md:grid-cols-5">
        <div className="md:col-span-2 space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground max-w-sm">
            The AI-adoption service layer for individual professionals: diagnostics, customised
            learning, coaching, evidence-based certification, and talent-network introductions.
          </p>
          <p className="text-xs text-muted-foreground/80">
            <span className="font-medium">TenXRole</span> manages the career journey.{" "}
            <span className="font-medium">TenXPros</span> develops and certifies the professional.{" "}
            <span className="font-medium">TenXOps</span> transforms the organisation.
          </p>
        </div>

        <FooterCol title="Platform">
          <FooterLink href="/professionals">For Professionals</FooterLink>
          <FooterLink href="/organizations">For Organizations</FooterLink>
          <FooterLink href="/certification">Certification</FooterLink>
          <FooterLink href="/learning-system">Learning System</FooterLink>
        </FooterCol>

        <FooterCol title="Company">
          <FooterLink href="/about">Method</FooterLink>
          <FooterLink href="/pricing">Pricing</FooterLink>
          <FooterLink href="/contact">Contact</FooterLink>
        </FooterCol>

        <FooterCol title="Trust">
          <FooterLink href="/certification#disclaimer">Certificate disclaimer</FooterLink>
          <FooterLink href="/about#privacy">Privacy posture</FooterLink>
          <FooterLink href="/about#ai-policy">AI use policy</FooterLink>
        </FooterCol>
      </div>
      <div className="border-t border-border">
        <div className="container py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} TenXPros. All rights reserved.</p>
          <p>
            TenXPros certificates verify completion and evidence review within the TenXPros framework.
            They do not represent external accreditation unless explicitly stated.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-3">{title}</h4>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        {children}
      </Link>
    </li>
  );
}
