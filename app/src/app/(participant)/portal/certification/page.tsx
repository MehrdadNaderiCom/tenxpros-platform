import { resolvePortalUserId } from "@/lib/participant/view";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";
import { resolveCredentialValidity } from "@/lib/credentials/status";
import Link from "next/link";

export default async function CertificationStatusPage() {
  const viewUserId = await resolvePortalUserId();
  const profile = await prisma.participantProfile.findUnique({
    where: { userId: viewUserId ?? "" },
    include: { certification: true, user: { include: { earnedBadges: { include: { badge: true } } } } },
  });
  if (!profile) throw new Error("Participant profile not found.");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Certification Status"
        description="Certification becomes available after module, dossier, and capstone review."
      />
      <Card className="space-y-4">
        <Badge status={profile.certification?.outcome ?? profile.status}>{profile.certification?.outcome ?? profile.status}</Badge>
        {profile.certification?.outcome === "CERTIFIED" &&
        (profile.certification?.field || profile.certification?.specialization) ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {profile.certification?.field ? (
              <div className="rounded-md border border-neutral-200 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Field</dt>
                <dd className="mt-1 font-medium text-navy-900">{profile.certification.field}</dd>
              </div>
            ) : null}
            {profile.certification?.specialization ? (
              <div className="rounded-md border border-neutral-200 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Specialization</dt>
                <dd className="mt-1 font-medium text-navy-900">{profile.certification.specialization}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        <p className="text-sm leading-6 text-slate-600">
          {profile.certification
            ? profile.certification.reviewerNotes
            : "No certification decision has been recorded yet."}
        </p>
        {profile.certification?.certificateUrl ? (
          <Link
            href={profile.certification.certificateUrl}
            className="inline-flex h-10 items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-navy-900 transition hover:bg-neutral-50"
          >
            View certificate
          </Link>
        ) : null}
      </Card>
      <Card>
        <h2 className="text-xl font-semibold text-navy-900">Badges</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {profile.user.earnedBadges.map((item) => {
            const validity = resolveCredentialValidity({
              storedStatus: item.status,
              expiresAt: item.expiresAt,
              badgeIsActive: item.badge.isActive,
              badgeCategory: item.badge.category,
              contextRef: item.contextRef,
              certification: profile.certification
                ? { id: profile.certification.id, outcome: profile.certification.outcome }
                : null,
            });
            return (
              <div key={item.id} className="rounded-md border border-neutral-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-navy-900">{item.badge.name}</p>
                  <Badge status={validity}>{validity}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">Verification: /verify/{item.verificationCode}</p>
              </div>
            );
          })}
          {profile.user.earnedBadges.length === 0 ? (
            <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm leading-6 text-slate-600 md:col-span-2">
              <p className="font-semibold text-navy-900">No badges earned yet.</p>
              <p className="mt-1">Module badges and the capstone seal appear here after reviewed work is approved.</p>
              <Link href="/portal/modules" className="mt-3 inline-flex font-medium text-navy-900">
                Review modules
              </Link>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
