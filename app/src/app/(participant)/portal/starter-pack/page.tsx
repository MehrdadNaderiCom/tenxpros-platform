import { resolvePortalUserId } from "@/lib/participant/view";
import { completeStarterPack } from "@/lib/actions/participant";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function StarterPackPage() {
  const viewUserId = await resolvePortalUserId();
  const profile = await prisma.participantProfile.findUnique({ where: { userId: viewUserId ?? "" } });
  const completed = Boolean(profile?.starterPackCompletedAt);

  return (
    <div className="space-y-8">
      <PageHeader title="Starter Pack" description="Orientation, confidentiality discipline, program rhythm, and dossier expectations." />
      <Card className="bg-neutral-50">
        <p className="text-sm leading-6 text-slate-700">
          Complete this once before the diagnostic. It sets the working agreement: protect sensitive data, use real professional context, and build evidence that can be reviewed.
        </p>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        {["Program rhythm", "Confidentiality guardrails", "Dossier standards"].map((item) => (
          <Card key={item}>
            <h2 className="text-xl font-semibold text-navy-900">{item}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Review this before starting the diagnostic intake. The goal is disciplined professional AI adoption.
            </p>
          </Card>
        ))}
      </div>
      <form action={completeStarterPack}>
        <Button type="submit" disabled={completed}>
          {completed ? "Starter Pack completed" : "Mark Starter Pack complete"}
        </Button>
      </form>
    </div>
  );
}
