import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <Card className="max-w-lg space-y-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">404</p>
        <h1 className="text-2xl font-semibold text-navy-900">Page not found</h1>
        <p className="text-sm leading-6 text-slate-600">The page may have moved or may require a different account.</p>
        <ButtonLink href="/" variant="secondary">Return home</ButtonLink>
      </Card>
    </main>
  );
}
