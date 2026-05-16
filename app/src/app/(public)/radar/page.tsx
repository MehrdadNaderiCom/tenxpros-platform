import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";

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
      <EmptyState
        eyebrow="Coming soon"
        title="Radar opens after the first certified cohort."
        description="The launch priority is the certification lifecycle. Radar subscription automation stays intentionally closed until there are alumni to serve."
        actionLabel="View the program"
        actionHref="/program"
      />
    </main>
  );
}
