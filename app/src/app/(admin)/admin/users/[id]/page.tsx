import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { application: true, participantProfile: true, directoryProfile: true, earnedBadges: { include: { badge: true } } },
  });
  if (!user) notFound();
  return (
    <div className="space-y-8">
      <PageHeader title={user.name ?? user.email} description={user.role} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card><h2 className="font-semibold text-navy-900">Application</h2><p className="mt-2 text-sm text-slate-600">{user.application?.status ?? "None"}</p></Card>
        <Card><h2 className="font-semibold text-navy-900">Participant</h2><p className="mt-2 text-sm text-slate-600">{user.participantProfile?.status ?? "None"}</p></Card>
        <Card><h2 className="font-semibold text-navy-900">Directory</h2><p className="mt-2 text-sm text-slate-600">{user.directoryProfile?.slug ?? "None"}</p></Card>
        <Card><h2 className="font-semibold text-navy-900">Badges</h2><p className="mt-2 text-sm text-slate-600">{user.earnedBadges.length}</p></Card>
      </div>
    </div>
  );
}
