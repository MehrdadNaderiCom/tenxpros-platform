import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const PUBLIC_LINKS = [
  { href: "/professionals", label: "Professionals" },
  { href: "/organizations", label: "Organizations" },
  { href: "/certification", label: "Certification" },
  { href: "/learning-system", label: "Learning" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "Method" },
  { href: "/contact", label: "Contact" },
];

export function PublicNav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-6">
          {PUBLIC_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">
            Sign in
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
