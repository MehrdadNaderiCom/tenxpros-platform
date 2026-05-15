"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <Card className="max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-navy-900">Something went wrong</h1>
        <p className="text-sm leading-6 text-slate-600">
          The page could not load. Retry once; if it continues, contact TenXPros support.
        </p>
        <Button onClick={reset}>Retry</Button>
      </Card>
    </main>
  );
}
