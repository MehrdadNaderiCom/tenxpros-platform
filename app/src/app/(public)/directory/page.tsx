import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Directory",
};

export default function DirectoryPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-10 px-6 py-16 md:px-8 md:py-24">
      <PageHeader
        eyebrow="Coming soon"
        title="The TenXPros Directory will open after certified profiles exist."
        description="Directory visibility is reserved for certified participants who opt in and control their public profile."
      />
      <Card>
        <p className="text-slate-600">
          Launch state: directory infrastructure exists, but public profiles remain closed until certification outcomes are available.
        </p>
      </Card>
    </main>
  );
}
