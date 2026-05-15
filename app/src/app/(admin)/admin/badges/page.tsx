import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function BadgesPage() {
  const [badges, issued] = await Promise.all([
    prisma.badge.findMany({ orderBy: { order: "asc" } }),
    prisma.participantBadge.findMany({ include: { user: true, badge: true }, orderBy: { earnedAt: "desc" }, take: 50 }),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader title="Badges" description="Read-only launch library plus recent issued badges. Special manual issuance stays minimal." />
      <div className="grid gap-3 md:grid-cols-3">
        {badges.map((badge) => (
          <Card key={badge.id}>
            <p className="font-semibold text-navy-900">{badge.name}</p>
            <p className="mt-1 text-sm text-slate-600">{badge.category}</p>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="text-xl font-semibold text-navy-900">Recent issued badges</h2>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          {issued.map((item) => (
            <p key={item.id}>{item.badge.name} · {item.user.email} · /verify/{item.verificationCode}</p>
          ))}
          {issued.length === 0 ? <p>No badges issued yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
