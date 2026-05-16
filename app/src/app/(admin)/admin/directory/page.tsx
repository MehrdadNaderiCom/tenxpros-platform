import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared/page-shell";

export default async function AdminDirectoryPage() {
  const profiles = await prisma.directoryProfile.findMany({ include: { user: true }, orderBy: { updatedAt: "desc" } });
  return (
    <div className="space-y-8">
      <PageHeader title="Directory" description="Directory draft and public profile management." />
      <div className="grid gap-4">
        {profiles.map((profile) => (
          <Card key={profile.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-navy-900">{profile.displayName}</h2>
              <p className="text-sm text-slate-600">{profile.title} · {profile.user.email}</p>
            </div>
            <Badge status={profile.isPublic ? "ACCEPTED" : "SUBMITTED"}>{profile.isPublic ? "Public" : "Draft"}</Badge>
          </Card>
        ))}
        {profiles.length === 0 ? (
          <EmptyState
            eyebrow="No directory profiles"
            title="No profiles are ready for directory review."
            description="Certified participants can opt in to profile visibility. Keep the public directory closed until real certified profiles exist."
            actionLabel="View certifications"
            actionHref="/admin/certifications"
          />
        ) : null}
      </div>
    </div>
  );
}
