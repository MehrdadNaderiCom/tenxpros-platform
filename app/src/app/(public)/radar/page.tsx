import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Radar",
};

export default function RadarPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-10 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        eyebrow="Coming soon"
        title="TenXPro Radar is the alumni signal layer."
        description="Radar will provide post-program AI updates, scenario signals, and practice refreshers for certified alumni."
      />
      <Card>
        <p className="text-slate-600">
          Launch state: informational only. Subscription automation is intentionally deferred.
        </p>
      </Card>
    </main>
  );
}
