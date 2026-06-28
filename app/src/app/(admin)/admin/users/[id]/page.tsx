import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/authz";
import { updateUser, deleteUser } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Input, Select } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

const USER_ROLES = ["APPLICANT", "PARTICIPANT", "COACH", "ADMIN", "PARTNER"] as const;

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const [user, session] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.id },
      include: {
        application: true,
        participantProfile: true,
        partner: { select: { id: true } },
        directoryProfile: true,
        earnedBadges: { include: { badge: true } },
      },
    }),
    auth(),
  ]);
  if (!user) notFound();

  const canManage = isSuperAdmin(session?.user?.email);
  const isSuper = isSuperAdmin(user.email);
  const hasLinkedEntity = Boolean(user.application || user.participantProfile || user.partner);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={user.name ?? user.email} description={user.role} />
        {canManage ? (
          <div className="flex items-center gap-2">
            {user.partner ? (
              <a
                href={`/admin/impersonate/partner/${user.partner.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50"
              >
                Open panel (read-only)
              </a>
            ) : null}
            {user.participantProfile ? (
              <a
                href={`/admin/impersonate/participant/${user.participantProfile.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-navy-700 transition hover:bg-navy-50"
              >
                Open portal (read-only)
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card><h2 className="font-semibold text-navy-900">Application</h2><p className="mt-2 text-sm text-slate-600">{user.application?.status ?? "None"}</p></Card>
        <Card><h2 className="font-semibold text-navy-900">Participant</h2><p className="mt-2 text-sm text-slate-600">{user.participantProfile?.status ?? "None"}</p></Card>
        <Card><h2 className="font-semibold text-navy-900">Directory</h2><p className="mt-2 text-sm text-slate-600">{user.directoryProfile?.slug ?? "None"}</p></Card>
        <Card><h2 className="font-semibold text-navy-900">Badges</h2><p className="mt-2 text-sm text-slate-600">{user.earnedBadges.length}</p></Card>
      </div>

      {canManage ? (
        <>
          <Card>
            <h2 className="text-lg font-semibold text-navy-900">Edit user</h2>
            {isSuper ? (
              <p className="mt-1 text-xs text-amber-700">
                This is a super-admin account. Only the name can be changed; its email and role are locked to prevent
                lockout.
              </p>
            ) : null}
            <form action={updateUser} className="mt-4 grid gap-3 md:grid-cols-3">
              <input type="hidden" name="userId" value={user.id} />
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Name</span>
                <Input name="name" defaultValue={user.name ?? ""} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Email</span>
                <Input name="email" type="email" defaultValue={user.email} disabled={isSuper} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Role</span>
                <Select name="role" defaultValue={user.role} disabled={isSuper}>
                  {USER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="md:col-span-3">
                <Button type="submit" size="sm">Save user</Button>
              </div>
            </form>
          </Card>

          <Card className="border-red-200">
            <h2 className="text-lg font-semibold text-red-700">Delete user</h2>
            {isSuper ? (
              <p className="mt-2 text-sm text-slate-600">A super-admin account cannot be deleted here.</p>
            ) : hasLinkedEntity ? (
              <p className="mt-2 text-sm text-slate-600">
                This user owns an application, participant profile, or partner record. Delete that record first
                (Applications / Participants / Partners), then delete the user.
              </p>
            ) : (
              <form className="mt-3">
                <input type="hidden" name="userId" value={user.id} />
                <p className="mb-3 text-sm text-slate-600">
                  Permanently delete this account and its sessions, tickets, directory entry and badges. This cannot be
                  undone.
                </p>
                <ConfirmButton action={deleteUser} message={`Permanently delete the user "${user.name ?? user.email}"? This cannot be undone.`}>
                  Delete user
                </ConfirmButton>
              </form>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
